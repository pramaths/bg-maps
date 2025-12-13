import { Message } from 'ai';
import dynamic from 'next/dynamic';
import React from 'react';

const Map = dynamic(() => import('../../components/map/map'), {
  ssr: false,
});


interface SidebarProps {
  messages: Message[];
  children: JSX.Element;
}


export default function Sidebar({ messages, children, ShowMessage, onSubmitFormComponent, iconMapping }: any) {
  return (
    <div className="flex h-screen">
      <div className="w-1/4 border-r border-border bg-background text-foreground">
        <div className="p-4">
          <h2 className="text-2xl bg-card text-card-foreground p-2 text-center rounded-sm font-bold border border-border">BangMaps</h2>

          <div className="mt-4">
            <details className="rounded-md border border-border bg-card p-3">
              <summary className="cursor-pointer select-none text-sm font-semibold">
                Map legend
              </summary>
              <div className="mt-3 space-y-2">
                {iconMapping && Object.entries(iconMapping).map(([key, url]: any) => (
                  <div key={key} className="flex items-center gap-3">
                    <img src={url} alt={key} className="h-6 w-6 object-contain" />
                    <span className="text-sm text-muted-foreground">{key}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
          <div className="mt-4 space-y-2">
            {messages.map((message, index) => {
              return <div className="p-2 rounded-md bg-card border border-border">
                <div className="text-sm text-muted-foreground">
                  {/* <strong>{message.role}:</strong> */}
                  {/* {message.content} */}
                  <ShowMessage message={message} onSubmitFormComponent={onSubmitFormComponent} />
                </div>
              </div>
            })
            }
          </div>
        </div>
      </div>
      <div className="w-3/4 bg-background">
        <div className="h-full">
          <div className="h-full w-full rounded-md border border-border overflow-hidden">
            {/* <Map center={position} markers={markers}/> */}
            {/* {JSON.stringify(bigMessages, null, 2)} */}
            {/* <ShowMessage message={bigMessage} /> */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}