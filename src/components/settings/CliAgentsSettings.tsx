import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCliAgents } from "@/hooks/useCliAgents";
import { CliAgentType } from "@/ipc/types/cli_agents";
import {
  ExternalLink,
  TestTube,
  Trash2,
  Settings,
  Terminal,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CliAgentCardProps {
  agentType: CliAgentType;
  name: string;
  description: string;
  website: string;
  installCommand: string;
}

function CliAgentCard({
  agentType,
  name,
  description,
  website,
  installCommand,
}: CliAgentCardProps) {
  const {
    getConfig,
    configureAgent,
    removeAgent,
    testAgent,
    isConfiguring,
    isRemoving,
    isTesting,
  } = useCliAgents();
  const { data: config, isLoading: isLoadingConfig } = getConfig(agentType);

  const [apiKey, setApiKey] = useState("");
  const [showInstall, setShowInstall] = useState(false);
  const isConfigured = !!config;
  const isEnabled = config?.enabled ?? false;

  const handleConfigure = async () => {
    await configureAgent({
      agentType,
      apiKey: apiKey || undefined,
      enabled: true,
    });
    setApiKey("");
  };

  const handleToggle = async () => {
    if (!config) return;
    await configureAgent({
      agentType,
      enabled: !config.enabled,
    });
  };

  const handleRemove = async () => {
    await removeAgent(agentType);
  };

  const handleTest = async () => {
    await testAgent(agentType);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {description}
              </CardDescription>
            </div>
          </div>
          {isConfigured && (
            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={isConfiguring}
              />
              <span className="text-sm text-muted-foreground">
                {isEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-4">
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Documentation
          </a>
          <button
            onClick={() => setShowInstall(!showInstall)}
            className="text-sm text-muted-foreground hover:text-foreground underline ml-2"
          >
            {showInstall ? "Hide install" : "Show install"}
          </button>
        </div>

        {showInstall && (
          <Alert className="mb-4 bg-muted">
            <AlertDescription>
              <code className="text-sm whitespace-pre-wrap">
                {installCommand}
              </code>
            </AlertDescription>
          </Alert>
        )}

        {isLoadingConfig ? (
          <Skeleton className="h-20 w-full" />
        ) : !isConfigured ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor={`api-key-${agentType}`}>API Key (optional)</Label>
              <Input
                id={`api-key-${agentType}`}
                type="password"
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use environment variable
              </p>
            </div>
            <Button
              onClick={handleConfigure}
              disabled={isConfiguring}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              {isConfiguring ? "Configuring..." : "Configure Agent"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">
                  {config.apiKeySet
                    ? "API key configured"
                    : "Using environment variable"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={isTesting || !isEnabled}
                >
                  <TestTube className="h-4 w-4 mr-1" />
                  {isTesting ? "Testing..." : "Test"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CliAgentsSettings() {
  const { agents, isLoadingAgents } = useCliAgents();

  if (isLoadingAgents) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No CLI agents available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Configure external CLI agents as MCP tools. These agents can be used
        alongside the built-in local agent.
      </div>
      {agents.map((agent) => (
        <CliAgentCard
          key={agent.type}
          agentType={agent.type}
          name={agent.name}
          description={agent.description}
          website={agent.website}
          installCommand={agent.installCommand}
        />
      ))}
    </div>
  );
}
