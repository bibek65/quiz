'use client';

import Link from 'next/link';
import { Monitor, Users, Eye } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const [spectatorId, setSpectatorId] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 tracking-tight">
            Quiz Platform
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-light">
            Real-time multiplayer quiz system
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6 animate-scale-in">
          {/* Host Card */}
          <Link
            href="/host"
            className="group card-interactive hover:scale-105 transition-transform duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-indigo-500/10 rounded-2xl group-hover:bg-indigo-500/20 transition-colors duration-200">
                <Monitor className="w-12 h-12 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Host</h2>
                <p className="text-slate-400 text-sm">Create and manage quiz sessions</p>
              </div>
              <div className="w-full pt-4">
                <div className="btn-primary w-full text-center">
                  Get Started
                </div>
              </div>
            </div>
          </Link>

          {/* Team Card */}
          <Link
            href="/team"
            className="group card-interactive hover:scale-105 transition-transform duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors duration-200">
                <Users className="w-12 h-12 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Team</h2>
                <p className="text-slate-400 text-sm">Join and participate in quizzes</p>
              </div>
              <div className="w-full pt-4">
                <div className="btn-success w-full text-center">
                  Join Quiz
                </div>
              </div>
            </div>
          </Link>

          {/* Spectator Card */}
          <div className="card hover:border-amber-500/50 transition-colors duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-amber-500/10 rounded-2xl">
                <Eye className="w-12 h-12 text-amber-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Spectator</h2>
                <p className="text-slate-400 text-sm">Watch quizzes live</p>
              </div>
              <div className="w-full pt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Enter Quiz ID"
                  value={spectatorId}
                  onChange={(e) => setSpectatorId(e.target.value)}
                  className="input text-center"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && spectatorId.trim()) {
                      window.location.href = `/quiz/${spectatorId.trim()}/spectator`;
                    }
                  }}
                  aria-label="Quiz ID for spectator mode"
                />
                <button
                  onClick={() => {
                    if (spectatorId.trim()) {
                      window.location.href = `/quiz/${spectatorId.trim()}/spectator`;
                    }
                  }}
                  disabled={!spectatorId.trim()}
                  className="btn-warning w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Watch Live
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          <p>Choose your role to get started</p>
        </div>
      </div>
    </div>
  );
}
