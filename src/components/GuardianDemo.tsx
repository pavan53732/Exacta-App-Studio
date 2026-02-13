import React, { useState } from "react";
import { z } from "zod";
import {
  useGuardian,
  useGuardianJobs,
  useGuardianCapabilities,
  useGuardianFirewall,
} from "@/hooks/useGuardian";
import {
  ListJobsResponseSchema,
  ListCapabilitiesResponseSchema,
  ListWfpRulesResponseSchema,
} from "@/ipc/types/guardian";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Activity,
  Key,
  Globe,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";

export const GuardianDemo: React.FC = () => {
  const { isConnected, status, isLoading, ping } = useGuardian();

  const jobsHook = useGuardianJobs();
  const jobsData = jobsHook.jobs.data as
    | z.infer<typeof ListJobsResponseSchema>
    | undefined;

  const capsHook = useGuardianCapabilities();
  const capsData = capsHook.capabilities.data as
    | z.infer<typeof ListCapabilitiesResponseSchema>
    | undefined;

  const firewallHook = useGuardianFirewall();
  const rulesData = firewallHook.rules.data as
    | z.infer<typeof ListWfpRulesResponseSchema>
    | undefined;

  const { createJob, terminateJob } = jobsHook;
  const { requestCapability, revokeCapability } = capsHook;
  const { createRule: _createRule, deleteRule } = firewallHook;

  // Form states
  const [newJobName, setNewJobName] = useState("Demo-Job");
  const [newResource, setNewResource] = useState("file:C:/temp/*");
  const [newAction, setNewAction] = useState<any>("read");

  const handleCreateJob = async () => {
    try {
      await createJob.mutateAsync({
        jobName: newJobName,
        memoryLimitBytes: 256 * 1024 * 1024, // 256MB
        cpuRatePercent: 10,
        killProcessesOnJobClose: true,
      });
      setNewJobName(`Demo-Job-${Math.floor(Math.random() * 1000)}`);
    } catch (error) {
      console.error("Failed to create job:", error);
    }
  };

  const handleRequestToken = async () => {
    try {
      await requestCapability.mutateAsync({
        subject: "demo-user",
        resource: newResource,
        action: newAction,
        expiresInSeconds: 3600,
      });
    } catch (error) {
      console.error("Failed to request token:", error);
    }
  };

  return (
    <div
      className="p-6 space-y-6 max-w-6xl mx-auto"
      data-testid="guardian-page"
    >
      <header className="flex justify-between items-center bg-background/50 backdrop-blur-md p-4 rounded-xl border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Guardian Security Center
          </h1>
          <p className="text-muted-foreground">
            Native Process Isolation & Capability Management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className="px-3 py-1"
            data-testid="guardian-status-badge"
          >
            {isConnected ? "CONNECTED" : "DISCONNECTED"}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => ping()}
            disabled={isLoading}
            data-testid="guardian-refresh-btn"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </header>

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger
            value="jobs"
            className="flex gap-2"
            data-testid="tab-jobs"
          >
            <Activity className="w-4 h-4" /> Job Objects
          </TabsTrigger>
          <TabsTrigger
            value="tokens"
            className="flex gap-2"
            data-testid="tab-tokens"
          >
            <Key className="w-4 h-4" /> Capabilities
          </TabsTrigger>
          <TabsTrigger
            value="firewall"
            className="flex gap-2"
            data-testid="tab-firewall"
          >
            <Globe className="w-4 h-4" /> Firewall
          </TabsTrigger>
          <TabsTrigger
            value="status"
            className="flex gap-2"
            data-testid="tab-status"
          >
            <Shield className="w-4 h-4" /> Service Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 md:col-span-1 border-t-4 border-t-primary">
              <h3 className="font-semibold mb-4 text-lg">Create Job Object</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Name</label>
                  <Input
                    placeholder="Enter job name..."
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    data-testid="job-name-input"
                  />
                </div>
                <Button
                  onClick={handleCreateJob}
                  className="w-full"
                  disabled={createJob.isPending}
                  data-testid="create-job-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createJob.isPending ? "Creating..." : "Initialize Job"}
                </Button>
              </div>
            </Card>

            <Card className="p-4 md-col-span-2">
              <h3 className="font-semibold mb-4 text-lg">Active Jobs</h3>
              <div className="space-y-3">
                {jobsData?.jobs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground italic border rounded-lg border-dashed">
                    No active job objects found
                  </div>
                ) : (
                  jobsData?.jobs?.map((jobName: string) => (
                    <div
                      key={jobName}
                      className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      data-testid="job-item"
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">{jobName}</p>
                          <p className="text-xs text-muted-foreground">
                            Process Isolation Layer
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          terminateJob.mutate({ jobName, exitCode: 1 })
                        }
                        disabled={terminateJob.isPending}
                        data-testid="terminate-job-btn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tokens">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4 md:col-span-1 border-t-4 border-t-blue-500">
              <h3 className="font-semibold mb-4 text-lg">Request Capability</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource URI</label>
                  <Input
                    placeholder="file:C:/..."
                    value={newResource}
                    onChange={(e) => setNewResource(e.target.value)}
                    data-testid="resource-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <select
                    className="w-full p-2 rounded-md border bg-background"
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    data-testid="action-select"
                  >
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                    <option value="execute">Execute</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button
                  onClick={handleRequestToken}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={requestCapability.isPending}
                  data-testid="request-token-btn"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Request JWT Token
                </Button>
              </div>
            </Card>

            <Card className="p-4 md-col-span-2">
              <h3 className="font-semibold mb-4 text-lg">
                Capability Inventory
              </h3>
              <div className="space-y-3">
                {capsData?.capabilities?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground italic border rounded-lg border-dashed">
                    No active tokens generated
                  </div>
                ) : (
                  capsData?.capabilities?.map((cap: any) => (
                    <div
                      key={cap.tokenId}
                      className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      data-testid="capability-item"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <Key className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{cap.resource}</p>
                            <p className="text-xs text-muted-foreground">
                              Action:{" "}
                              <span className="text-primary uppercase font-bold">
                                {cap.action}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={cap.revoked ? "outline" : "default"}
                            className={cap.revoked ? "opacity-50" : ""}
                            data-testid="capability-badge"
                          >
                            {cap.revoked ? "REVOKED" : "ACTIVE"}
                          </Badge>
                          {!cap.revoked && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() =>
                                revokeCapability.mutate({
                                  tokenId: cap.tokenId,
                                })
                              }
                              data-testid="revoke-token-btn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] mt-2 font-mono text-muted-foreground break-all bg-accent/30 p-1 rounded">
                        UUID: {cap.tokenId}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="firewall">
          <Card className="p-8 text-center border-dashed border-2">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Firewall Rules (WFP)</h3>
            <p className="text-muted-foreground mb-6">
              Network isolation rules managed via Windows Filtering Platform.
            </p>
            <div className="grid grid-cols-1 md-grid-cols-2 gap-4 max-w-2xl mx-auto">
              {rulesData?.rules?.map((rule: any) => (
                <div
                  key={rule.ruleId}
                  className="p-4 border rounded-xl text-left flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.direction} | {rule.action}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRule.mutate({ ruleId: rule.ruleId })}
                  >
                    <Trash2 className="w-4 h-4 h-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-sm italic mt-6">
              WFP Manager is currently in stub mode. Fully native implementation
              pending.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" /> Native Service Health
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Endpoint</span>
                  <code className="bg-accent px-1 rounded">
                    \\.\pipe\DyadGuardian
                  </code>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Protocol</span>
                  <span>Named Pipes (JSON)</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Heartbeat</span>
                  <span>
                    {status?.timestamp
                      ? new Date(status.timestamp).toLocaleTimeString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Target Framework
                  </span>
                  <Badge variant="outline">.NET 8.0 Windows</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-4 text-primary">
                Security Architecture
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    <strong>Kernel Objects:</strong> Jobs are used to
                    hard-restrict memory and CPU cycles.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    <strong>Zero-Trust:</strong> Every request requires a valid
                    JWT Capability Token.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    <strong>Process Shield:</strong> Child processes
                    automatically inherit parent job restrictions.
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
