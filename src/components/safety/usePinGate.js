import { useState, useCallback } from 'react';

/**
 * Queue a callback behind the PTW PIN gate.
 * Usage: const { requestPin, pinGateProps } = usePinGate();
 *        requestPin('start_permit', () => doAction());
 *        <PinGate {...pinGateProps} language={language} />
 */
export default function usePinGate() {
    const [state, setState] = useState({ open: false, gate: null, onSuccess: null });

    const requestPin = useCallback((gate, onSuccess) => {
        setState({ open: true, gate, onSuccess });
    }, []);

    const close = useCallback(() => {
        setState({ open: false, gate: null, onSuccess: null });
    }, []);

    const handleSuccess = useCallback(() => {
        const fn = state.onSuccess;
        close();
        if (fn) fn();
    }, [state.onSuccess, close]);

    return {
        requestPin,
        pinGateProps: {
            open: state.open,
            gate: state.gate,
            onSuccess: handleSuccess,
            onCancel: close,
        },
    };
}
