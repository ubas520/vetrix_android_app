import { createContext, useContext, useMemo, useState } from 'react';

import { useClientData } from './ClientDataContext';

const PetSelectionContext = createContext(null);

export function PetSelectionProvider({ children }) {
  const { pets } = useClientData();
  const [selectedPetId, setSelectedPetId] = useState('All');
  const selectedPet = useMemo(
    () => pets.find((pet) => String(pet.id) === String(selectedPetId)) || null,
    [pets, selectedPetId],
  );
  const effectiveSelectedPetId = selectedPet ? selectedPetId : 'All';

  const value = useMemo(
    () => ({ selectedPet, selectedPetId: effectiveSelectedPetId, setSelectedPetId }),
    [effectiveSelectedPetId, selectedPet],
  );

  return <PetSelectionContext.Provider value={value}>{children}</PetSelectionContext.Provider>;
}

export function usePetSelection() {
  const context = useContext(PetSelectionContext);
  if (!context) throw new Error('usePetSelection must be used inside PetSelectionProvider');
  return context;
}
