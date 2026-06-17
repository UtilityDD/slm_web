/* eslint-disable react/prop-types */
import React from 'react';

/**
 * Wraps a PPE SVG layer with equip / unequip / update scale animations.
 */
export default function GearLayer({ name, show, anim, ox = 114, oy = 150, ghost = null, children }) {
    const isTarget = anim?.name === name;
    const equipping = isTarget && anim?.action === 'equip';
    const unequipping = isTarget && anim?.action === 'unequip';
    const updating = isTarget && anim?.action === 'update';
    const visible = show || unequipping;

    return (
        <>
            {ghost && !show && !unequipping && (
                <g opacity={equipping ? 0.15 : 0.35} style={{ transition: 'opacity 0.3s' }}>
                    {ghost}
                </g>
            )}
            {visible && (
                <g transform={`translate(${ox}, ${oy})`}>
                    {(equipping || updating) && (
                        <>
                            <animateTransform
                                attributeName="transform"
                                type="scale"
                                values={equipping ? '0.35;1.1;1' : '1;1.07;1'}
                                keyTimes="0;0.55;1"
                                dur={equipping ? '0.52s' : '0.34s'}
                                fill="freeze"
                                additive="sum"
                            />
                            {equipping && (
                                <animate attributeName="opacity" values="0;1" dur="0.45s" fill="freeze" />
                            )}
                        </>
                    )}
                    {unequipping && (
                        <>
                            <animateTransform
                                attributeName="transform"
                                type="scale"
                                values="1;0.3"
                                dur="0.42s"
                                fill="freeze"
                                additive="sum"
                            />
                            <animate attributeName="opacity" values="1;0" dur="0.42s" fill="freeze" />
                        </>
                    )}
                    <g transform={`translate(${-ox}, ${-oy})`}>{children}</g>
                </g>
            )}
        </>
    );
}
