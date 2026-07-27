// src/app/(dashboard)/design-system/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/primitive/Button";
import { Badge } from "@/components/primitive/Badge";
import { Modal } from "@/components/compound/Modal";
import { Combobox } from "@/components/compound/Combobox";
import styles from "./design-system.module.css";

type Theme = "dark" | "light" | "high-contrast";
type Tab = "tokens" | "modal" | "combobox";

const TOKEN_GROUPS: { title: string; tokens: string[] }[] = [
  {
    title: "Backgrounds",
    tokens: ["--ix-bg", "--ix-surface", "--ix-surface-raised"],
  },
  { title: "Borders", tokens: ["--ix-border", "--ix-border-subtle"] },
  {
    title: "Text",
    tokens: [
      "--ix-text-primary",
      "--ix-text-secondary",
      "--ix-text-muted",
      "--ix-text-on-accent",
    ],
  },
  {
    title: "Accent",
    tokens: [
      "--ix-accent",
      "--ix-accent-hover",
      "--ix-accent-subtle",
      "--ix-accent-solid-bg",
    ],
  },
  { title: "Status", tokens: ["--ix-success", "--ix-warning", "--ix-danger"] },
  { title: "Focus", tokens: ["--ix-focus-ring"] },
];

const PEOPLE = [
  { id: "p1", name: "Amina Youssef", role: "Frontend Engineer" },
  { id: "p2", name: "Karim Adel", role: "Backend Engineer" },
  { id: "p3", name: "Sara Mostafa", role: "Product Designer" },
];

/** Reads a CSS custom property's *current* resolved value, so the swatch
 * label always matches whatever theme is active — rather than hardcoding
 * hex strings here that would drift out of sync with theme.css. */
function useResolvedTokenValues(tokenNames: string[], theme: Theme) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const name of tokenNames) {
      next[name] = computed.getPropertyValue(name).trim();
    }
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return values;
}

export default function DesignSystemPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [tab, setTab] = useState<Tab>("tokens");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [comboQuery, setComboQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<{
    id: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const allTokenNames = TOKEN_GROUPS.flatMap((g) => g.tokens);
  const resolved = useResolvedTokenValues(allTokenNames, theme);

  const matches = PEOPLE.filter((p) =>
    p.name.toLowerCase().includes(comboQuery.trim().toLowerCase()),
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>IX-Design System</h1>
      <p className={styles.subtitle}>
        Token palettes, theme switching, and live component demos.
      </p>

      <div className={styles.themeToggle} role="radiogroup" aria-label="Theme">
        {(["dark", "light", "high-contrast"] as Theme[]).map((t) => (
          <button
            key={t}
            role="radio"
            aria-checked={theme === t}
            className={`${styles.themeButton} ${theme === t ? styles.themeButtonActive : ""}`}
            onClick={() => setTheme(t)}
          >
            {t === "high-contrast"
              ? "High Contrast"
              : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div
        className={styles.tabList}
        role="tablist"
        aria-label="Design system sections"
      >
        {(
          [
            { id: "tokens", label: "Tokens" },
            { id: "modal", label: "Modal" },
            { id: "combobox", label: "Combobox" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------------- Tokens ---------------- */}
      {tab === "tokens" && (
        <div role="tabpanel" id="panel-tokens" aria-labelledby="tab-tokens">
          {TOKEN_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className={styles.tokenGroupTitle}>{group.title}</h2>
              <div className={styles.swatchGrid}>
                {group.tokens.map((name) => (
                  <div key={name} className={styles.swatch}>
                    <div
                      className={styles.swatchColor}
                      style={{ background: `var(${name})` }}
                    />
                    <div className={styles.swatchLabel}>
                      <span className={styles.swatchName}>{name}</span>
                      <span className={styles.swatchValue}>
                        {resolved[name] || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- Modal ---------------- */}
      {tab === "modal" && (
        <div role="tabpanel" id="panel-modal" aria-labelledby="tab-modal">
          <div className={styles.card}>
            <p className={styles.demoLabel}>Confirmation dialog (sm)</p>
            <Modal open={confirmOpen} onOpenChange={setConfirmOpen}>
              <Modal.Trigger asChild>
                <Button variant="danger">Delete cluster</Button>
              </Modal.Trigger>
              <Modal.Portal>
                <Modal.Overlay />
                <Modal.Content size="sm" aria-labelledby="confirm-title">
                  <Modal.Header>
                    <Modal.Title id="confirm-title">
                      Delete cluster?
                    </Modal.Title>
                    <Modal.CloseButton />
                  </Modal.Header>
                  <Modal.Body>
                    <p>
                      This can&apos;t be undone. All associated resources will
                      be removed.
                    </p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setConfirmOpen(false)}
                    >
                      Delete
                    </Button>
                  </Modal.Footer>
                </Modal.Content>
              </Modal.Portal>
            </Modal>
          </div>

          <div className={styles.card}>
            <p className={styles.demoLabel}>Form dialog (lg)</p>
            <Modal open={formOpen} onOpenChange={setFormOpen}>
              <Modal.Trigger asChild>
                <Button variant="primary">New project</Button>
              </Modal.Trigger>
              <Modal.Portal>
                <Modal.Overlay />
                <Modal.Content size="lg" aria-labelledby="form-title">
                  <Modal.Header>
                    <Modal.Title id="form-title">Create project</Modal.Title>
                    <Modal.CloseButton />
                  </Modal.Header>
                  <Modal.Body>
                    <p>Project form fields would go here.</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      variant="secondary"
                      onClick={() => setFormOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setFormOpen(false)}
                    >
                      Create
                    </Button>
                  </Modal.Footer>
                </Modal.Content>
              </Modal.Portal>
            </Modal>
          </div>
        </div>
      )}

      {/* ---------------- Combobox ---------------- */}
      {tab === "combobox" && (
        <div role="tabpanel" id="panel-combobox" aria-labelledby="tab-combobox">
          <div className={styles.card}>
            <p className={styles.demoLabel}>Assign to</p>
            <div style={{ maxWidth: 320 }}>
              <Combobox
                onInputValueChange={setComboQuery}
                onValueChange={(id, label) => setSelectedPerson({ id, label })}
              >
                <Combobox.Input placeholder="Search people..." />
                <Combobox.List emptyState={`No matches for "${comboQuery}"`}>
                  {matches.map((p) => (
                    <Combobox.Item key={p.id} id={p.id} label={p.name}>
                      {p.name} — {p.role}
                    </Combobox.Item>
                  ))}
                </Combobox.List>
              </Combobox>
            </div>
            <div className={styles.demoRow} style={{ marginTop: 12 }}>
              {selectedPerson ? (
                <Badge variant="accent" withDot>
                  {selectedPerson.label}
                </Badge>
              ) : (
                <Badge variant="neutral">No selection</Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
