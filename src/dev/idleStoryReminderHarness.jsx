import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import IdleStoryReminder from '../components/IdleStoryReminder';

function Harness() {
    const [currentView, setCurrentView] = useState('home');
    const [openedStoryId, setOpenedStoryId] = useState(null);

    return (
        <div className="min-h-screen bg-slate-900 p-6 text-white">
            <p data-testid="harness-ready" className="text-sm text-slate-400">
                Idle story test harness — modal should appear after ~600ms idle
            </p>
            <p data-testid="current-view" className="mt-2 text-sm">
                view: {currentView}
            </p>
            <p data-testid="opened-story" className="mt-1 text-sm">
                openedStory: {openedStoryId ?? 'none'}
            </p>
            <IdleStoryReminder
                language="en"
                currentView={currentView}
                setCurrentView={setCurrentView}
                onRequestOpenStory={setOpenedStoryId}
                blocked={false}
            />
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Harness />
    </React.StrictMode>
);
