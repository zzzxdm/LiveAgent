import { useMemo, useState } from "react";
import { useLocale } from "../../i18n";
import type { SshHostConfig } from "../../lib/settings";
import { cn } from "../../lib/shared/utils";
import { ArrowLeft, Check, Globe, Key, Server, Settings } from "../icons";
import { Button } from "../ui/button";

type SshTunnelScope = "project" | "all";
type SshTunnelView = "list" | "settings";

type SshTunnelPanelProps = {
  projectPathKey: string;
  hosts: SshHostConfig[];
  associatedHostIds: string[];
  onAssociatedHostIdsChange: (hostIds: string[]) => void;
};

function endpointLabel(host: SshHostConfig) {
  const userPrefix = host.username.trim() ? `${host.username.trim()}@` : "";
  return `${userPrefix}${host.host}:${host.port}`;
}

function authLabel(host: Pick<SshHostConfig, "authType">, t: (key: string) => string) {
  return host.authType === "privateKey"
    ? t("settings.sshAuthPrivateKey")
    : t("settings.sshAuthPassword");
}

function hostHasMeta(host: SshHostConfig) {
  return (
    (host.authType === "privateKey" &&
      (host.privateKeyPath.trim().length > 0 || host.privateKeyConfigured === true)) ||
    host.proxy.url.trim().length > 0 ||
    host.proxy.port > 0 ||
    host.proxy.passwordConfigured === true
  );
}

function HostMetaTags(props: { host: SshHostConfig }) {
  const { host } = props;
  const { t } = useLocale();
  const tags: string[] = [];
  if (host.authType === "privateKey" && host.privateKeyPath.trim()) {
    tags.push(host.privateKeyPath.trim());
  } else if (host.authType === "privateKey" && host.privateKeyConfigured) {
    tags.push(t("settings.sshPrivateKeyConfigured"));
  }
  if (host.proxy.url.trim().length > 0 || host.proxy.port > 0 || host.proxy.passwordConfigured) {
    tags.push(t("settings.sshAdvancedProxy"));
  }
  if (tags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="max-w-full truncate rounded-md bg-muted/70 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"
          title={tag}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function SshTunnelPanel(props: SshTunnelPanelProps) {
  const { projectPathKey, hosts, associatedHostIds, onAssociatedHostIdsChange } = props;
  const { t } = useLocale();
  const [scope, setScope] = useState<SshTunnelScope>("project");
  const [view, setView] = useState<SshTunnelView>("list");
  const associatedSet = useMemo(() => new Set(associatedHostIds), [associatedHostIds]);
  const associatedHosts = useMemo(
    () => hosts.filter((host) => associatedSet.has(host.id)),
    [associatedSet, hosts],
  );

  const toggleHost = (hostId: string) => {
    const current = associatedHostIds.filter((id) => hosts.some((host) => host.id === id));
    const next = associatedSet.has(hostId)
      ? current.filter((id) => id !== hostId)
      : [...current, hostId];
    onAssociatedHostIdsChange(next);
  };

  const settingsActive = view === "settings";
  const listPageClassName = cn(
    "absolute inset-0 flex min-h-0 flex-col bg-gradient-to-b from-muted/40 via-muted/15 to-background transition-[opacity,transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none",
    settingsActive
      ? "pointer-events-none z-0 -translate-x-4 opacity-0"
      : "z-10 translate-x-0 opacity-100",
  );
  const settingsPageClassName = cn(
    "absolute inset-0 flex min-h-0 flex-col bg-background transition-[opacity,transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none",
    settingsActive
      ? "z-10 translate-x-0 opacity-100"
      : "pointer-events-none z-0 translate-x-4 opacity-0",
  );

  const emptyTitle =
    scope === "project"
      ? t("projectTools.sshTunnelProjectEmpty")
      : t("projectTools.sshTunnelAllEmpty");
  const emptyHint =
    scope === "project"
      ? associatedHosts.length > 0
        ? t("projectTools.sshTunnelProjectEmptyWithHosts")
        : t("projectTools.sshTunnelProjectEmptyHint")
      : t("projectTools.sshTunnelAllEmptyHint");

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-background">
      <div className={settingsPageClassName} aria-hidden={!settingsActive} inert={!settingsActive}>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            title={t("projectTools.sshTunnelBack")}
            onClick={() => setView("list")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {t("projectTools.sshTunnelAssociateHosts")}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {t("projectTools.sshTunnelAssociateHostsHint")}
            </div>
          </div>
          <div className="rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
            <span className="tabular-nums text-foreground">{associatedHosts.length}</span>{" "}
            {t("projectTools.sshTunnelAssociatedCount")}
          </div>
        </div>

        {hosts.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Key className="h-6 w-6" />
            </div>
            <div className="max-w-xs space-y-1">
              <div className="text-sm font-medium text-foreground">
                {t("projectTools.sshTunnelNoConfiguredHosts")}
              </div>
              <div className="text-xs leading-relaxed text-muted-foreground">
                {t("projectTools.sshTunnelNoConfiguredHostsHint")}
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-2">
              {hosts.map((host) => {
                const selected = associatedSet.has(host.id);
                return (
                  <button
                    key={host.id}
                    type="button"
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card px-3 py-3 text-left transition-all hover:border-emerald-500/40 hover:bg-muted/40",
                      selected && "border-emerald-500/50 bg-emerald-500/5",
                    )}
                    aria-pressed={selected}
                    onClick={() => toggleHost(host.id)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Server className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {host.name}
                        </span>
                        <span className="shrink-0 rounded-md bg-muted/70 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                          {authLabel(host, t)}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {endpointLabel(host)}
                      </div>
                      {hostHasMeta(host) ? <HostMetaTags host={host} /> : null}
                    </div>
                    <span
                      className={cn(
                        "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        selected
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border bg-background text-transparent",
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={listPageClassName} aria-hidden={settingsActive} inert={settingsActive}>
        <div className="shrink-0 border-b border-border/60 bg-background/70 px-4 pb-3 pt-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-foreground/70 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.6),0_1px_2px_hsl(0_0%_0%_/_0.05)] dark:shadow-none">
              <Key className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold tracking-tight text-foreground">
                {t("projectTools.sshTunnelTitle")}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {projectPathKey
                  ? t("projectTools.sshTunnelConfiguredHosts").replace(
                      "{count}",
                      String(associatedHosts.length),
                    )
                  : t("projectTools.sshTunnelNoProject")}
              </div>
            </div>
            {scope === "project" ? (
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border/60 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title={t("projectTools.sshTunnelSettings")}
                aria-label={t("projectTools.sshTunnelSettings")}
                onClick={() => setView("settings")}
              >
                <Settings className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div
            role="group"
            aria-label={t("projectTools.sshTunnelScopeGroup")}
            className="relative mt-3 grid grid-cols-2 gap-0.5 rounded-lg bg-muted/70 p-0.5"
          >
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 transform-gpu rounded-[7px] bg-background shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none",
                scope === "all" ? "translate-x-full" : "translate-x-0",
              )}
            />
            {(["project", "all"] as const).map((option) => {
              const selected = scope === option;
              const Icon = option === "project" ? Server : Globe;
              const label =
                option === "project"
                  ? t("projectTools.sshTunnelScopeProject")
                  : t("projectTools.sshTunnelScopeAll");
              return (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "relative z-10 flex h-7 min-w-0 transform-gpu items-center justify-center gap-1.5 rounded-[7px] px-2 text-xs text-muted-foreground transition-[color,transform] duration-200 ease-out hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:active:scale-100",
                    selected && "font-medium text-foreground",
                  )}
                  title={label}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => setScope(option)}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-10 text-center">
            <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-background/80 text-muted-foreground/70 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.6),0_1px_3px_hsl(0_0%_0%_/_0.05)] dark:shadow-none">
              <Key className="h-5 w-5" />
            </div>
            <div className="text-xs font-medium text-foreground/80">{emptyTitle}</div>
            <div className="max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">
              {emptyHint}
            </div>
            {scope === "project" && associatedHosts.length === 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7 rounded-lg bg-background/70 px-2.5 text-xs"
                onClick={() => setView("settings")}
              >
                {t("projectTools.sshTunnelAssociateHosts")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
