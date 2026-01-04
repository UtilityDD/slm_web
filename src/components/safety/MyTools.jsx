import React from 'react';
import EquipmentManager from './EquipmentManager';

const MyTools = ({ user, setCurrentView, language }) => {
    return (
        <EquipmentManager
            type="tools"
            user={user}
            language={language}
            setCurrentView={setCurrentView}
            showCategories={true}
            showSaveButton={true}
            accentColor="indigo"
        />
    );
};

export default MyTools;
