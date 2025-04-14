import { render } from 'preact';
import { PastebinEditor } from './components/PastebinEditor';
import './style.css';

export function App() {
    return (
        <PastebinEditor />
    );
}

const container = document.getElementById('app');
if (container) {
    render(<App />, container);
}