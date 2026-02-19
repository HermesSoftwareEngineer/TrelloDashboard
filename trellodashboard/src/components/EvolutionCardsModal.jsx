import CardsListModal from './CardsListModal';

/**
 * Modal exibindo processos novos e concluídos de um ponto do gráfico de evolução.
 *
 * @param {Object}   point   - { label, newCards, completedCards }
 * @param {boolean}  dark    - Tema escuro
 * @param {Function} onClose - Callback para fechar o modal
 */
const EvolutionCardsModal = ({ point, dark = true, onClose }) => {
  if (!point) return null;

  const sections = [
    {
      title: 'Novos Processos',
      dotColor: 'bg-blue-500',
      accentColor: dark ? 'text-blue-400' : 'text-blue-600',
      badgeColor: dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700',
      cards: point.newCards,
      dateField: 'creationDate',
    },
    {
      title: 'Processos Concluídos',
      dotColor: 'bg-green-500',
      accentColor: dark ? 'text-green-400' : 'text-green-600',
      badgeColor: dark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
      cards: point.completedCards,
      dateField: 'completionDate',
    },
  ];

  return (
    <CardsListModal
      title={point.label}
      subtitle="Processos do período"
      sections={sections}
      dark={dark}
      onClose={onClose}
    />
  );
};

export default EvolutionCardsModal;
