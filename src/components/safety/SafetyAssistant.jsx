import React, { useState } from 'react';
import SafetyHelp from './SafetyHelp';
import DatabookManager from './DatabookManager';
import SopEnvelopeIntro from './SopEnvelopeIntro';

/**
 * Suraksha Sathi / সবাই ফিরো:
 *  - Envelope intro: SAFE HOME chant & Job-specific 8-step SOPs.
 *  - Safety Help: emergency safety guidance.
 *  - Edit Data Book: lineman contacts & sub-station numbers.
 */
export default function SafetyAssistant({ language = 'bn', onClose }) {
  const [mode, setMode] = useState(null); // null | help | databook

  const goHome = () => setMode(null);

  if (mode === 'help') {
    return <SafetyHelp language={language} onClose={goHome} />;
  }
  if (mode === 'databook') {
    return <DatabookManager language={language} onClose={goHome} />;
  }

  return (
    <SopEnvelopeIntro
      language={language}
      onClose={onClose}
      onOpenDatabook={() => setMode('databook')}
      onOpenHelp={() => setMode('help')}
    />
  );
}
