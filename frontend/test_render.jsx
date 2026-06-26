import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Draw2D from './src/Draw2D.jsx';

try {
  const html = renderToString(
    <MemoryRouter>
      <Draw2D />
    </MemoryRouter>
  );
  console.log("RENDER SUCCESS:", html.substring(0, 100));
} catch (e) {
  console.error("RENDER ERROR:", e);
}
