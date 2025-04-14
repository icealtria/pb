// src/App.tsx
import { hydrate, prerender as ssr } from 'preact-iso';
import { PastebinEditor } from './components/PastebinEditor'; // Import the new component
import './style.css'; // Import shared styles

export function App() {
	return (
		<PastebinEditor />
	);
}

// Hydration and prerendering logic remains the same
if (typeof window !== 'undefined') {
	const container = document.getElementById('app');
	if (container && container.hasChildNodes()) { // Ensure container has content before hydrating
		hydrate(<App />, container);
	} else if (container) {
		// If SSR didn't run or container is empty, just render
		// This might happen in development or specific setups
		import('preact').then(preact => {
			preact.render(<App />, container);
		});
	}
}

export async function prerender(data: any) { // Add type for data if known, else any
	return await ssr(<App {...data} />);
}