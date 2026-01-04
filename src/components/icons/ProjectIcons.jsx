import React from 'react';

// Common props for consistency
const defaultProps = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: "w-6 h-6" // default size, can be overridden
};

export const TrainingIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
    </svg>
); // School/Graduation Cap style

export const SafetyIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.61 8 10.91 4.59-1.3 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
    </svg>
); // Shield with alert/cross

export const CommunityIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
); // Groups

export const EmergencyIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M20.79 11.23l-3.56-6.16c-.2-.35-.57-.57-.98-.57H7.76c-.41 0-.78.22-.98.57L3.21 11.23c-.2.35-.2.79 0 1.14l3.56 6.16c.2.35.57.57.98.57h8.49c.41 0 .78-.22.98-.57l3.56-6.16c.21-.36.21-.8 0-1.14zM12 17c-.55 0-1-.45-1-1v-2h-2c-.55 0-1-.45-1-1s.45-1 1-1h2v-2c0-.55.45-1 1-1s1 .45 1 1v2h2c.55 0 1 .45 1 1s-.45 1-1 1h-2v2c0 .55-.45 1-1 1z" />
    </svg>
); // Warning/Emergency Octagon with Cross

export const AdminIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-9-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
    </svg>
); // Padlock/Secure Admin

export const UserIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
    </svg>
); // Circle User

export const CompetitionIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M20.2 2H3.8c-.7 0-1.2.6-1.2 1.2v1.5c0 2.8 1.8 5.2 4.4 6 1 2 2.7 3.5 4.8 3.9V19H8v2h8v-2h-3.8v-4.4c2.1-.4 3.8-1.9 4.8-3.9 2.6-.9 4.4-3.3 4.4-6V3.2c0-.6-.5-1.2-1.2-1.2zM5.2 4.4h1.7v3.5c0 1.5-.7 2.8-1.7 3.6V4.4zm13.6 3.6c-1 .9-1.7 2.1-1.7 3.6V4.4h1.7v3.6z" />
    </svg>
);

export const MyPPEIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M12 4c-4.42 0-8 3.58-8 8v1h-1v3h1v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1h1v-3h-1v-1c0-4.42-3.58-8-8-8zm0 2c3.31 0 6 2.69 6 6v1h-3.5C12.4 12.08 12 11.1 12 10.5 12 11.1 11.6 12.08 9.5 13H6v-1c0-3.31 2.69-6 6-6z" />
    </svg>
);

export const LeaderboardIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
    </svg>
); // Bar Chart

export const HandbookIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
    </svg>
); // Book

export const MyToolsIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
    </svg>
); // Wrench

export const ShareIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
    </svg>
);

export const NotificationIcon = (props) => (
    <svg {...defaultProps} {...props}>
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
    </svg>
);
