/* eslint-disable react/prop-types */
import React from 'react';
import SafetyAssistant from './SafetyAssistant';

const SOPs = ({ language, setCurrentView }) => {
    return (
        <div className="fixed inset-0 z-[9999]">
            <SafetyAssistant 
                language={language} 
                onClose={() => setCurrentView ? setCurrentView('home') : window.location.reload()} 
            />
        </div>
    );
};

export default SOPs;
