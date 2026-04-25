/* eslint-disable react/prop-types */
import React from 'react';
import SafetyAssistant from './SafetyAssistant';

const SOPs = ({ language, setCurrentView }) => {
    return (
        <SafetyAssistant 
            language={language} 
            onClose={() => setCurrentView ? setCurrentView('home') : window.location.reload()} 
        />
    );
};

export default SOPs;
