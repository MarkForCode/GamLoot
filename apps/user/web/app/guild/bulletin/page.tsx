'use client';

import { useState } from 'react';
import { AppShell } from '../../components/AppShell';

type Post = {
  id: number;
  title: string;
  author: string;
  body: string;
  tag: 'EVENT' | 'RECRUIT' | 'SYS_MSG' | 'RULES';
  time: string;
  comments: number;
  read: boolean;
};

const posts: Post[] = [
  {
    id: 1,
    title: 'Operation: Void Collapse',
    author: '@CommanderVex',
    body: 'Attention all active roster members. We have received confirmation that the Void Core instance will reset tomorrow at 18:00 ST. This is a mandatory progression push for all Vanguard-tier players.\n\nPhase 1 will focus on securing the outer perimeter defenses. Ensure your loadouts are optimized for high-burst AoE, as the mob density in sectors Alpha and Bravo has been increased in the latest patch.',
    tag: 'EVENT',
    time: '2 hours ago',
    comments: 14,
    read: false,
  },
  {
    id: 2,
    title: 'Seeking Healers for Core Team',
    author: '@RecruitOfficer_K',
    body: 'We are actively seeking experienced healer mains for our core progression team. Minimum requirements: Rank 30+, clear history in hard-mode content, and active availability on weekends.',
    tag: 'RECRUIT',
    time: 'Yesterday',
    comments: 3,
    read: false,
  },
  {
    id: 3,
    title: 'Server Maintenance Window',
    author: '@SystemBot',
    body: 'Scheduled maintenance will occur this Saturday from 02:00 to 06:00 ST. All marketplace transactions will be paused during this window. Pending bids will be preserved.',
    tag: 'SYS_MSG',
    time: '2 days ago',
    comments: 0,
    read: true,
  },
  {
    id: 4,
    title: 'Code of Conduct Rev. 4',
    author: '@GuildLeader',
    body: 'All members must review the updated loot distribution rules before the weekend raid schedule begins. Non-compliance results in DKP penalty. This revision includes updated policies on alt-account trading and auction sniping.',
    tag: 'RULES',
    time: '3 days ago',
    comments: 7,
    read: true,
  },
];

const tagMeta: Record<Post['tag'], { color: string; dot: string; glow: string }> = {
  EVENT: { color: 'text-primary', dot: 'bg-primary', glow: 'shadow-[0_0_4px_#dbfcff]' },
  RECRUIT: { color: 'text-secondary', dot: 'bg-secondary', glow: 'shadow-[0_0_4px_#ecb2ff]' },
  SYS_MSG: { color: 'text-on-surface-variant', dot: 'bg-outline-variant', glow: '' },
  RULES: { color: 'text-error', dot: 'bg-error', glow: 'shadow-[0_0_4px_#ffb4ab]' },
};

const filterLabels: Array<{ tag: Post['tag'] | 'ALL'; label: string }> = [
  { tag: 'ALL', label: 'All' },
  { tag: 'EVENT', label: 'Events' },
  { tag: 'RECRUIT', label: 'Recruitment' },
  { tag: 'RULES', label: 'Rules' },
];

export default function BulletinBoard() {
  const [activeId, setActiveId] = useState(1);
  const [filter, setFilter] = useState<Post['tag'] | 'ALL'>('ALL');
  const [comment, setComment] = useState('');

  const activePost = posts.find((p) => p.id === activeId) ?? posts[0];
  const filtered = filter === 'ALL' ? posts : posts.filter((p) => p.tag === filter);

  return (
    <AppShell activeHref="/guild/bulletin">
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <h2 className="font-h2 text-h2 text-on-surface text-glow-primary">Bulletin Board</h2>
        <div className="flex gap-sm flex-wrap">
          {filterLabels.map(({ tag, label }) => {
            const meta = tag === 'ALL' ? null : tagMeta[tag];
            return (
              <button
                key={tag}
                onClick={() => setFilter(tag)}
                className={`bg-surface-container border border-outline-variant rounded px-md py-sm font-label-caps text-label-caps flex items-center gap-2 hover:bg-surface-container-high transition-colors ${meta ? meta.color : 'text-on-surface-variant'} ${filter === tag ? 'border-outline' : ''}`}
              >
                {meta && <span className={`w-2 h-2 rounded-full ${meta.dot} ${meta.glow}`} />}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-lg">
        {/* Main Post View */}
        <div className="xl:col-span-8 flex flex-col gap-lg">
          {/* Pinned Directive */}
          <div className="bg-surface-container-high border border-error/50 rounded-xl p-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-error/10 rounded-bl-full" />
            <div className="flex items-center gap-2 mb-sm">
              <span className="material-symbols-outlined text-error text-lg">push_pin</span>
              <h4 className="font-label-caps text-label-caps text-error tracking-widest">Pinned Directive</h4>
            </div>
            <h3 className="font-h3 text-h3 text-on-surface mb-2">Code of Conduct Rev. 4</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
              All members must review the updated loot distribution rules before the weekend raid schedule begins. Non-compliance results in DKP penalty.
            </p>
            <button className="inline-flex items-center gap-1 font-mono-data text-mono-data text-xs text-error mt-sm hover:underline">
              Acknowledge <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          {/* Active Post */}
          <article className="bg-surface-container border border-outline-variant rounded-xl p-lg flex flex-col gap-md">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-md">
                <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-2xl">person</span>
                </div>
                <div>
                  <h3 className="font-h3 text-h3 text-on-surface leading-tight">{activePost.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono-data text-mono-data text-primary-fixed-dim text-sm">{activePost.author}</span>
                    <span className="text-on-surface-variant font-body-sm text-body-sm">• {activePost.time}</span>
                    <span className={`bg-surface-bright border border-outline-variant px-2 py-0.5 rounded font-label-caps text-[10px] ml-2 flex items-center gap-1 ${tagMeta[activePost.tag].color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tagMeta[activePost.tag].dot} ${tagMeta[activePost.tag].glow}`} />
                      {activePost.tag}
                    </span>
                  </div>
                </div>
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>

            <div className="font-body-md text-body-md text-on-surface-variant space-y-4">
              {activePost.body.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-outline-variant pt-md">
              <div className="flex gap-4">
                <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-mono-data text-mono-data text-sm">
                  <span className="material-symbols-outlined text-lg">forum</span>
                  {activePost.comments} Comments
                </button>
                <button className="flex items-center gap-2 text-on-surface-variant hover:text-secondary transition-colors font-mono-data text-mono-data text-sm">
                  <span className="material-symbols-outlined text-lg">share</span>
                  Share
                </button>
              </div>
              <button className="bg-primary-container text-on-primary-container font-label-caps text-label-caps px-md py-2 rounded hover:opacity-90 active:scale-95 transition-all border border-primary flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Mark as Read
              </button>
            </div>
          </article>

          {/* Comments */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-lg flex flex-col gap-md">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Recent Comms</h4>
            <div className="flex gap-sm items-start">
              <div className="w-8 h-8 rounded bg-surface-container border border-outline-variant flex-shrink-0 flex items-center justify-center mt-1">
                <span className="material-symbols-outlined text-on-surface-variant text-base">person</span>
              </div>
              <div className="flex-1 bg-surface border border-outline-variant rounded-lg px-md py-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex gap-sm items-center">
                <input
                  className="w-full bg-transparent border-none text-on-surface font-body-sm text-body-sm focus:outline-none placeholder:text-on-surface-variant/50"
                  placeholder="Transmit message..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button className="text-primary-fixed-dim hover:text-primary transition-colors shrink-0">
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            </div>
            <div className="flex gap-sm items-start">
              <div className="w-8 h-8 rounded bg-surface-container-highest border border-outline-variant flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-base">person</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-data text-mono-data text-secondary-fixed-dim text-sm">@NovaSnipe</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">45m ago</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface mt-1">Loadout is prepped. Will be in staging channel at 17:40 ST.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="xl:col-span-4 flex flex-col gap-lg">
          <div className="bg-surface-container border border-outline-variant rounded-xl flex flex-col overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Guild Feed</h4>
              <span className="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-on-surface">filter_list</span>
            </div>
            <div className="flex flex-col divide-y divide-outline-variant/50">
              {filtered.map((post) => {
                const meta = tagMeta[post.tag];
                const isActive = post.id === activeId;
                return (
                  <button
                    key={post.id}
                    onClick={() => setActiveId(post.id)}
                    className={`p-md text-left hover:bg-surface-container-highest transition-colors w-full ${isActive ? 'bg-surface-container-highest border-l-2 border-primary' : ''} ${post.read ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {post.read
                        ? <span className="material-symbols-outlined text-[10px] text-on-surface-variant">done_all</span>
                        : <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${meta.glow}`} />
                      }
                      <span className={`font-mono-data text-mono-data text-xs ${meta.color}`}>{post.tag}</span>
                    </div>
                    <h4 className="font-body-md text-body-md font-semibold text-on-surface">{post.title}</h4>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-xs mt-1 block">
                      {post.time}{post.comments > 0 ? ` • ${post.comments} Comms` : post.read ? ' • Read' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
