'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/stat-card';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalGenerations: number;
  generationsThisMonth: number;
  generationsToday: number;
  activeUsersLast7d: number;
  errorRate: number;
  avgLatencyMs: number;
  totalStorageBytes: number;
  planDistribution: { plan: string; count: number }[];
  dailyGenerations: { date: string; count: number }[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function AdminOverviewClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-text-muted text-sm">Loading admin stats...</div>
    );
  }

  if (!stats) {
    return (
      <div className="text-red-400 text-sm">Failed to load admin stats.</div>
    );
  }

  const maxDaily = Math.max(...stats.dailyGenerations.map((d) => d.count), 1);

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard value={stats.totalUsers.toLocaleString()} label="Total Users" />
        <StatCard value={stats.generationsThisMonth.toLocaleString()} label="Generations This Month" />
        <StatCard value={stats.generationsToday.toLocaleString()} label="Generations Today" />
        <StatCard value={stats.activeUsersLast7d.toLocaleString()} label="Active Users (7d)" />
        <StatCard value={`${stats.errorRate}%`} label="Error Rate" />
        <StatCard
          value={stats.avgLatencyMs > 0 ? `${(stats.avgLatencyMs / 1000).toFixed(1)}s` : '—'}
          label="Avg Latency"
        />
        <StatCard value={formatBytes(stats.totalStorageBytes)} label="Total Storage" />
        <StatCard value={stats.totalGenerations.toLocaleString()} label="All-Time Generations" />
      </div>

      {/* Plan Distribution */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Plan Distribution</h2>
        <div className="flex gap-4">
          {stats.planDistribution.map((p) => (
            <div
              key={p.plan}
              className="flex-1 rounded-lg border border-border-subtle bg-surface p-4"
            >
              <div className="text-lg font-bold text-text-primary">{p.count}</div>
              <div className="text-xs text-text-muted capitalize">{p.plan}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Generations Chart */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">
          Daily Generations (Last 30 Days)
        </h2>
        <div className="rounded-lg border border-border-subtle bg-surface p-4">
          <div className="flex items-end gap-[2px] h-32">
            {stats.dailyGenerations.map((d, i) => (
              <div
                key={d.date}
                className="flex-1 bg-accent/80 hover:bg-accent rounded-t transition-colors"
                style={{ height: `${Math.max((d.count / maxDaily) * 100, 2)}%` }}
                title={`${d.date}: ${d.count} generations`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-text-dim">
            <span>{stats.dailyGenerations[0]?.date}</span>
            <span>{stats.dailyGenerations[stats.dailyGenerations.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Link
          href="/admin/users"
          className="flex-1 rounded-lg border border-border-subtle bg-surface p-4 hover:border-accent/50 transition-colors"
        >
          <div className="text-sm font-semibold text-text-primary">Manage Users</div>
          <div className="text-xs text-text-muted mt-1">View all users, change plans, manage accounts</div>
        </Link>
        <Link
          href="/admin/generations"
          className="flex-1 rounded-lg border border-border-subtle bg-surface p-4 hover:border-accent/50 transition-colors"
        >
          <div className="text-sm font-semibold text-text-primary">All Generations</div>
          <div className="text-xs text-text-muted mt-1">View every PDF generation across all users</div>
        </Link>
      </div>
    </div>
  );
}
