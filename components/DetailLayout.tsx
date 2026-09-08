"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface DetailLayoutProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  main: ReactNode;
  side: ReactNode;
}

/** Shared two-column detail layout: record content plus actions/history rail. */
export function DetailLayout({ backHref, backLabel, title, subtitle, actions, main, side }: DetailLayoutProps) {
  return (
    <div className="detail">
      <Link href={backHref} className="backLink">
        ← {backLabel}
      </Link>
      <header className="detailHeader">
        <div>
          <h1>{title}</h1>
          {subtitle && <div className="detailSubtitle">{subtitle}</div>}
        </div>
        {actions && <div className="detailActions">{actions}</div>}
      </header>
      <div className="detailGrid">
        <div className="detailMain">{main}</div>
        <aside className="detailSide">{side}</aside>
      </div>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="cardTitle">{title}</h2>
      {children}
    </section>
  );
}

export function FieldList({ fields }: { fields: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="fieldList">
      {fields.map((field) => (
        <div key={field.label} className="field">
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
