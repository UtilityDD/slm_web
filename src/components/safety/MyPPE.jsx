import React from 'react';
import EquipmentManager from './EquipmentManager';

const MyPPE = ({ user, setCurrentView, language }) => {
    return (
        <EquipmentManager
            type="ppe"
            user={user}
            language={language}
            setCurrentView={setCurrentView}
            showCategories={true}
            showSaveButton={true}
            accentColor="orange"
        />
    );
};

export default MyPPE;
