# Security Policy

## Supported Versions

We will provide security fixes for the latest version of Dyad and encourage Dyad users through auto-updates to use the latest version of the app.

## Security Features

Dyad includes several security features to protect users:

### Windows: Dyad Guardian Service

On Windows, Dyad includes the **Guardian Service** - a .NET 8 native service that provides:

- **Process Isolation**: Uses Windows Job Objects to sandbox spawned processes with memory limits, CPU throttling, and automatic termination
- **Capability-Based Security**: JWT tokens for fine-grained access control to files, processes, and network resources
- **Network Filtering**: Windows Filtering Platform (WFP) integration for per-process firewall rules
- **Administrative Dashboard**: WPF-based UI for real-time security monitoring

See [docs/guardian.md](docs/guardian.md) for technical details.

## Reporting a Vulnerability

Please file security vulnerabilities by using [report a vulnerability](https://github.com/dyad-sh/dyad/security/advisories/new). Please do not file security vulnerabilities as a regular issue as the information could be used to exploit Dyad users.
