import React from 'react';

function HelmetMark({ className = '' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 28 18"
            width="28"
            height="18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M4 10c0-5.2 3.8-9 10-9s10 3.8 10 9v2.2H4V10Z"
                fill="#f97316"
                stroke="#0f172a"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d="M2.5 12.2h23" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="21.5" cy="9" r="1.4" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.8" />
        </svg>
    );
}

/**
 * Ambient stick-figure lineman on the nonprofit strip top border.
 * Detailed worker walk outbound, then return / hat-bonk / Vision fall gags.
 */
export default function LandingNonprofitLineman() {

    return (
        <div className="landing-nonprofit-lineman" aria-hidden="true">
            <div className="landing-nonprofit-lineman__cap-fly">
                <HelmetMark className="landing-nonprofit-lineman__cap-fly-svg" />
            </div>

            <div className="landing-nonprofit-lineman__walker">
                <svg
                    className="landing-nonprofit-lineman__svg"
                    viewBox="0 0 48 64"
                    width="48"
                    height="64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g transform="translate(24 43)">
                        <g className="landing-nonprofit-lineman__torso">
                            <g className="landing-nonprofit-lineman__helmet">
                                <path
                                    d="M-8 -25c0-5.2 3.8-9 8-9s8 3.8 8 9v2.2h-16V-25Z"
                                    fill="#f97316"
                                    stroke="#0f172a"
                                    strokeWidth="1.6"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M-9.5 -22.8h19"
                                    stroke="#0f172a"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                />
                                <circle cx="7.5" cy="-26" r="1.4" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.8" />
                            </g>

                            <circle cx="0" cy="-19.5" r="5.2" fill="#fde68a" stroke="#0f172a" strokeWidth="1.6" />
                            <path d="M0 -14v14" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />

                            <g className="landing-nonprofit-lineman__arms">
                                <path
                                    d="M0 -10c-5 2-8 7-9 11"
                                    stroke="#0f172a"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M0 -10c4.5 1.5 7 5 8.5 9"
                                    stroke="#0f172a"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                />
                            </g>
                        </g>

                        {/* Left Leg */}
                        <g className="landing-nonprofit-lineman__leg landing-nonprofit-lineman__leg-l-hip">
                            <line x1="0" y1="0" x2="0" y2="8.5" className="landing-nonprofit-lineman__limb" />
                            <g transform="translate(0 8.5)">
                                <g className="landing-nonprofit-lineman__leg-l-knee">
                                    <line x1="0" y1="0" x2="0" y2="8" className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__shin" />
                                    <g transform="translate(0 8)">
                                        <g className="landing-nonprofit-lineman__leg-l-foot">
                                            <path d="M0 0h2.8" className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__foot" />
                                        </g>
                                    </g>
                                </g>
                            </g>
                        </g>

                        {/* Right Leg */}
                        <g className="landing-nonprofit-lineman__leg landing-nonprofit-lineman__leg-r-hip">
                            <line x1="0" y1="0" x2="0" y2="8.5" className="landing-nonprofit-lineman__limb" />
                            <g transform="translate(0 8.5)">
                                <g className="landing-nonprofit-lineman__leg-r-knee">
                                    <line x1="0" y1="0" x2="0" y2="8" className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__shin" />
                                    <g transform="translate(0 8)">
                                        <g className="landing-nonprofit-lineman__leg-r-foot">
                                            <path d="M0 0h2.8" className="landing-nonprofit-lineman__limb landing-nonprofit-lineman__foot" />
                                        </g>
                                    </g>
                                </g>
                            </g>
                        </g>
                    </g>
                </svg>
            </div>
        </div>
    );
}
