import React from "react";

export default function SmartLinemanUI() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">SL</div>
                <div>
                  <div className="text-lg font-semibold">SmartLineman</div>
                  <div className="text-xs text-gray-500">Field training & resources</div>
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a className="hover:text-indigo-600">Resources</a>
              <a className="hover:text-indigo-600">Tools</a>
              <a className="hover:text-indigo-600">Trainings</a>
              <a className="hover:text-indigo-600">Community</a>
              <a className="hover:text-indigo-600">Support</a>
            </nav>

            <div className="flex items-center gap-3">
              <button className="hidden sm:inline-block px-4 py-2 border rounded-md text-sm">Help</button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm">Login</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Super Clean Landing */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg">
            SL
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            SmartLineman
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl">
            Practical tools, training and field‑ready resources for India's power utility workers.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <a className="px-5 py-2.5 border rounded-md text-sm hover:bg-gray-100 cursor-pointer">Resources</a>
            <a className="px-5 py-2.5 border rounded-md text-sm hover:bg-gray-100 cursor-pointer">Tools</a>
            <a className="px-5 py-2.5 border rounded-md text-sm hover:bg-gray-100 cursor-pointer">Training</a>
            <a className="px-5 py-2.5 border rounded-md text-sm hover:bg-gray-100 cursor-pointer">Support</a>
            <a className="px-5 py-2.5 bg-indigo-600 text-white rounded-md text-sm cursor-pointer">Login</a>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ----------------- Small UI subcomponents ----------------- */
function StatCard({ title, value }) {
  return (
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h3 className="text-xl font-semibold">{title}</h3>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function ResourceCard({ type, title, meta }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm flex items-start gap-4">
      <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center text-sm font-medium">{type}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-gray-500 mt-1">{meta}</div>
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-1 border rounded text-sm">Open</button>
          <button className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Download</button>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ title, desc }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-gray-500 mt-1">{desc}</div>
      <div className="mt-4">
        <button className="px-3 py-2 w-full bg-indigo-600 text-white rounded">Open Tool</button>
      </div>
    </div>
  );
}
