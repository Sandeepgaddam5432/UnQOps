import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Create a mobile app about UnQOps' },
  { text: 'Build a todo app in React using Tailwind' },
  { text: 'Build a simple blog using Astro' },
  { text: 'Create a cookie consent form using Material UI' },
  { text: 'Make a space invaders game' },
  { text: 'Make a Tic Tac Toe game in html, css and js only' },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="workspace-examples">
      <span className="workspace-section-label">TRY AN EXAMPLE</span>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="workspace-example"
            >
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
