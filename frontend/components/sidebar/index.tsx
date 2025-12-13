import React from 'react';

export default function Sidebar({ messages, children, ShowMessage, onSubmitFormComponent, iconMapping }: any) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="w-[400px] shrink-0 border-r border-zinc-200 bg-zinc-50 text-zinc-900 flex flex-col h-full">
        <div className="p-2 flex flex-col h-full overflow-hidden">
          <h2 className="text-2xl bg-yellow-500 text-zinc-900 p-3 text-center rounded-lg font-bold border border-zinc-200 shadow-sm mb-4">BANGMAPS</h2>

          <div className="mb-4 shrink-0">
            <details className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm group">
              <summary className="cursor-pointer select-none text-sm font-semibold flex items-center justify-between">
                <span>Map legend</span>
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 space-y-2">
                {iconMapping && Object.entries(iconMapping).map(([key, url]: any) => (
                  <div key={key} className="flex items-center gap-3">
                    <img src={url} alt={key} className="h-6 w-6 object-contain" />
                    <span className="text-sm text-zinc-600 capitalize">{key}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {messages.map((message, index) => {
              return <div key={index} className="rounded-full bg-white border border-zinc-200 shadow-sm">
                <div className="text-sm text-zinc-700">
                  <ShowMessage message={message} onSubmitFormComponent={onSubmitFormComponent} />
                </div>
              </div>
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Dark Theme */}
      <div className="flex-1 bg-neutral-950 text-neutral-50 relative">
        <div className="h-full w-full">
          {children}
        </div>
      </div>
    </div>
  );
}