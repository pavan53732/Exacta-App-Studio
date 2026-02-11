using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Dyad.Guardian.Messages;
using Microsoft.IdentityModel.Tokens;

namespace Dyad.Guardian.Services;

/// <summary>
/// Manages capability tokens for fine-grained access control
/// </summary>
public class CapabilityTokenService
{
    private readonly ILogger<CapabilityTokenService> _logger;
    private readonly SymmetricSecurityKey _signingKey;
    private readonly Dictionary<string, CapabilityEntry> _activeTokens = new();
    private readonly object _lock = new();
    private readonly JwtSecurityTokenHandler _tokenHandler = new();
    
    // Token settings
    private const string Issuer = "dyad-guardian";
    private const string Audience = "dyad-client";
    private const int DefaultTokenExpirationHours = 1;
    private const int MaxTokenExpirationHours = 24;
    
    public CapabilityTokenService(ILogger<CapabilityTokenService> logger)
    {
        _logger = logger;
        
        // Generate a random signing key for this session
        // In production, this should be persisted securely
        var keyBytes = new byte[32];
        RandomNumberGenerator.Fill(keyBytes);
        _signingKey = new SymmetricSecurityKey(keyBytes);
        
        _logger.LogInformation("CapabilityTokenService initialized with new signing key");
    }
    
    public Task<CapabilityTokenResponse> RequestCapabilityAsync(RequestCapabilityRequest request)
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                try
                {
                    // Validate request
                    if (string.IsNullOrEmpty(request.Subject))
                        throw new ArgumentException("Subject is required");
                    if (string.IsNullOrEmpty(request.Resource))
                        throw new ArgumentException("Resource is required");
                    if (string.IsNullOrEmpty(request.Action))
                        throw new ArgumentException("Action is required");
                    
                    // Validate and cap expiration
                    var expirationHours = Math.Min(
                        request.ExpiresInSeconds.HasValue 
                            ? request.ExpiresInSeconds.Value / 3600.0 
                            : DefaultTokenExpirationHours,
                        MaxTokenExpirationHours);
                    
                    var tokenId = Guid.NewGuid().ToString("N");
                    var issuedAt = DateTime.UtcNow;
                    var expiresAt = issuedAt.AddHours(expirationHours);
                    
                    // Build claims
                    var claims = new List<Claim>
                    {
                        new Claim("jti", tokenId),
                        new Claim("sub", request.Subject),
                        new Claim("res", request.Resource),
                        new Claim("act", request.Action),
                        new Claim("iat", new DateTimeOffset(issuedAt).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
                        new Claim("cap", "true") // Capability token marker
                    };
                    
                    // Add constraint claims
                    if (request.Constraints != null)
                    {
                        foreach (var constraint in request.Constraints)
                        {
                            claims.Add(new Claim($"con:{constraint.Key}", constraint.Value?.ToString() ?? ""));
                        }
                    }
                    
                    // Create token
                    var tokenDescriptor = new SecurityTokenDescriptor
                    {
                        Subject = new ClaimsIdentity(claims),
                        Issuer = Issuer,
                        Audience = Audience,
                        Expires = expiresAt,
                        SigningCredentials = new SigningCredentials(_signingKey, SecurityAlgorithms.HmacSha256Signature),
                        NotBefore = issuedAt
                    };
                    
                    var token = _tokenHandler.CreateToken(tokenDescriptor);
                    var tokenString = _tokenHandler.WriteToken(token);
                    
                    // Store active token
                    _activeTokens[tokenId] = new CapabilityEntry
                    {
                        TokenId = tokenId,
                        Subject = request.Subject,
                        Resource = request.Resource,
                        Action = request.Action,
                        IssuedAt = issuedAt,
                        ExpiresAt = expiresAt,
                        TokenString = tokenString,
                        Constraints = request.Constraints?.ToDictionary(
                            kvp => kvp.Key,
                            kvp => kvp.Value?.ToString() ?? "") ?? new Dictionary<string, string>(),
                        Revoked = false
                    };
                    
                    _logger.LogInformation(
                        "Issued capability token {TokenId} for {Subject} to {Action}:{Resource}, expires {ExpiresAt}",
                        tokenId, request.Subject, request.Action, request.Resource, expiresAt);
                    
                    return new CapabilityTokenResponse
                    {
                        Success = true,
                        Token = tokenString,
                        TokenId = tokenId,
                        ExpiresAt = new DateTimeOffset(expiresAt).ToUnixTimeMilliseconds()
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to issue capability token");
                    return new CapabilityTokenResponse
                    {
                        Success = false,
                        Error = ex.Message
                    };
                }
            }
        });
    }
    
    public Task<ValidateCapabilityResponse> ValidateCapabilityAsync(ValidateCapabilityRequest request)
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                try
                {
                    if (string.IsNullOrEmpty(request.Token))
                        throw new ArgumentException("Token is required");
                    
                    // Validate JWT
                    var validationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = Issuer,
                        ValidateAudience = true,
                        ValidAudience = Audience,
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = _signingKey,
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.FromMinutes(5)
                    };
                    
                    var principal = _tokenHandler.ValidateToken(
                        request.Token, 
                        validationParameters, 
                        out var validatedToken);
                    
                    // Check if it's a capability token
                    var capClaim = principal.FindFirst("cap");
                    if (capClaim?.Value != "true")
                    {
                        return new ValidateCapabilityResponse
                        {
                            Valid = false,
                            Error = "Not a valid capability token"
                        };
                    }
                    
                    // Get token ID and check revocation
                    var tokenId = principal.FindFirst("jti")?.Value;
                    if (tokenId != null && _activeTokens.TryGetValue(tokenId, out var entry))
                    {
                        if (entry.Revoked)
                        {
                            return new ValidateCapabilityResponse
                            {
                                Valid = false,
                                Error = "Token has been revoked"
                            };
                        }
                    }
                    
                    // Extract claims
                    var subject = principal.FindFirst("sub")?.Value ?? "";
                    var resource = principal.FindFirst("res")?.Value ?? "";
                    var action = principal.FindFirst("act")?.Value ?? "";
                    
                    // Validate resource/action if specified
                    if (!string.IsNullOrEmpty(request.Resource) && !MatchesResource(resource, request.Resource))
                    {
                        return new ValidateCapabilityResponse
                        {
                            Valid = false,
                            Error = $"Resource mismatch: token has '{resource}', request is for '{request.Resource}'"
                        };
                    }
                    
                    if (!string.IsNullOrEmpty(request.Action) && !MatchesAction(action, request.Action))
                    {
                        return new ValidateCapabilityResponse
                        {
                            Valid = false,
                            Error = $"Action mismatch: token has '{action}', request is for '{request.Action}'"
                        };
                    }
                    
                    // Extract constraint claims
                    var claims = new Dictionary<string, object>();
                    foreach (var claim in principal.Claims.Where(c => c.Type.StartsWith("con:")))
                    {
                        claims[claim.Type.Substring(4)] = claim.Value;
                    }
                    
                    _logger.LogDebug(
                        "Validated capability token for {Subject} on {Action}:{Resource}",
                        subject, action, resource);
                    
                    return new ValidateCapabilityResponse
                    {
                        Valid = true,
                        Subject = subject,
                        Resource = resource,
                        Action = action,
                        Claims = claims
                    };
                }
                catch (SecurityTokenExpiredException)
                {
                    return new ValidateCapabilityResponse
                    {
                        Valid = false,
                        Error = "Token has expired"
                    };
                }
                catch (SecurityTokenException ex)
                {
                    return new ValidateCapabilityResponse
                    {
                        Valid = false,
                        Error = $"Invalid token: {ex.Message}"
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to validate capability token");
                    return new ValidateCapabilityResponse
                    {
                        Valid = false,
                        Error = ex.Message
                    };
                }
            }
        });
    }
    
    public Task<bool> RevokeCapabilityAsync(string tokenId)
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                try
                {
                    if (!_activeTokens.TryGetValue(tokenId, out var entry))
                    {
                        _logger.LogWarning("Attempted to revoke non-existent token {TokenId}", tokenId);
                        return false;
                    }
                    
                    entry.Revoked = true;
                    _logger.LogInformation("Revoked capability token {TokenId} for {Subject}", tokenId, entry.Subject);
                    return true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to revoke token {TokenId}", tokenId);
                    return false;
                }
            }
        });
    }
    
    public Task<ListCapabilitiesResponse> ListCapabilitiesAsync()
    {
        return Task.Run(() =>
        {
            lock (_lock)
            {
                // Clean up expired tokens first
                var now = DateTime.UtcNow;
                var expiredTokens = _activeTokens
                    .Where(kvp => kvp.Value.ExpiresAt < now && !kvp.Value.Revoked)
                    .Select(kvp => kvp.Key)
                    .ToList();
                
                foreach (var tokenId in expiredTokens)
                {
                    _activeTokens.Remove(tokenId);
                }
                
                var capabilities = _activeTokens.Values.Select(entry => new CapabilityInfo
                {
                    TokenId = entry.TokenId,
                    Subject = entry.Subject,
                    Resource = entry.Resource,
                    Action = entry.Action,
                    IssuedAt = new DateTimeOffset(entry.IssuedAt).ToUnixTimeMilliseconds(),
                    ExpiresAt = new DateTimeOffset(entry.ExpiresAt).ToUnixTimeMilliseconds(),
                    Revoked = entry.Revoked
                }).ToList();
                
                return new ListCapabilitiesResponse
                {
                    Capabilities = capabilities
                };
            }
        });
    }
    
    private bool MatchesResource(string tokenResource, string requestResource)
    {
        // Exact match
        if (tokenResource == requestResource)
            return true;
        
        // Wildcard match (e.g., "file:/path/*" matches "file:/path/to/file")
        if (tokenResource.EndsWith("*"))
        {
            var prefix = tokenResource.TrimEnd('*');
            return requestResource.StartsWith(prefix);
        }
        
        return false;
    }
    
    private bool MatchesAction(string tokenAction, string requestAction)
    {
        // Exact match
        if (tokenAction == requestAction)
            return true;
        
        // "write" implies "read"
        if (tokenAction == "write" && requestAction == "read")
            return true;
        
        // "execute" implies "read"
        if (tokenAction == "execute" && requestAction == "read")
            return true;
        
        // "admin" implies all
        if (tokenAction == "admin")
            return true;
        
        return false;
    }
    
    private class CapabilityEntry
    {
        public required string TokenId { get; init; }
        public required string Subject { get; init; }
        public required string Resource { get; init; }
        public required string Action { get; init; }
        public required DateTime IssuedAt { get; init; }
        public required DateTime ExpiresAt { get; init; }
        public required string TokenString { get; init; }
        public required Dictionary<string, string> Constraints { get; init; }
        public bool Revoked { get; set; }
    }
}
