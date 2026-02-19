import { useEffect } from 'react';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const EmptyMessage = ({ dark }) => (
  <p className={`text-sm italic py-2 ${dark ? 'text-neutral-600' : 'text-neutral-400'}`}>
    Nenhum processo nesta categoria.
  </p>
);

const CardTable = ({ cards, dateField, accentColor, dark }) => {
  if (!cards || cards.length === 0) return <EmptyMessage dark={dark} />;

  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-xs ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
        <thead>
          <tr className={`border-b ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <th className="text-left py-2 pr-4 font-semibold">Processo</th>
            <th className="text-left py-2 pr-4 font-semibold">Tipo</th>
            <th className="text-left py-2 pr-4 font-semibold">Responsável</th>
            <th className="text-left py-2 font-semibold whitespace-nowrap">Data</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr
              key={card.id}
              className={`border-b transition-colors ${
                dark
                  ? 'border-neutral-800 hover:bg-neutral-800/60'
                  : 'border-neutral-100 hover:bg-neutral-50'
              }`}
            >
              <td className="py-2 pr-4 max-w-[240px]">
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:underline font-medium ${accentColor}`}
                  title={card.name}
                >
                  {card.name}
                </a>
              </td>
              <td className="py-2 pr-4">
                {card.processTypes?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {card.processTypes.map((t) => (
                      <span
                        key={t.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          dark ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={dark ? 'text-neutral-600' : 'text-neutral-400'}>—</span>
                )}
              </td>
              <td className="py-2 pr-4">
                {card.members?.length > 0 ? (
                  card.members.map((m) => m.name).join(', ')
                ) : (
                  <span className={dark ? 'text-neutral-600' : 'text-neutral-400'}>—</span>
                )}
              </td>
              <td className="py-2 whitespace-nowrap">
                {formatDate(card[dateField])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Modal genérico de listagem de processos.
 *
 * @param {string}   title    - Título principal do modal
 * @param {string}   subtitle - Subtítulo (ex: nome do período ou tipo)
 * @param {Array}    sections - Array de seções:
 *   [{ title, count, cards, dotColor, accentColor, dateField }]
 * @param {boolean}  dark     - Tema escuro
 * @param {Function} onClose  - Callback para fechar
 */
const CardsListModal = ({ title, subtitle, sections = [], dark = true, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl ${
          dark
            ? 'bg-[#111111] border border-[#272727]'
            : 'bg-white border border-[#e5e5e5]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
            dark ? 'border-[#272727]' : 'border-[#e5e5e5]'
          }`}
        >
          <div>
            {subtitle && (
              <p className={`text-xs uppercase tracking-widest font-bold ${
                dark ? 'text-neutral-500' : 'text-neutral-500'
              }`}>
                {subtitle}
              </p>
            )}
            <h2 className={`text-lg font-bold mt-0.5 ${
              dark ? 'text-neutral-100' : 'text-neutral-900'
            }`}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors text-lg leading-none ${
              dark
                ? 'hover:bg-neutral-800 text-neutral-500 hover:text-neutral-200'
                : 'hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800'
            }`}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {sections.map((section, idx) => (
            <div key={idx}>
              {/* Divider between sections */}
              {idx > 0 && (
                <div className={`border-t mb-6 ${dark ? 'border-[#272727]' : 'border-[#e5e5e5]'}`} />
              )}

              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full inline-block ${section.dotColor}`} />
                <h3 className={`text-xs font-bold uppercase tracking-widest ${section.accentColor}`}>
                  {section.title}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${section.badgeColor}`}>
                  {section.cards?.length ?? 0}
                </span>
              </div>

              <CardTable
                cards={section.cards}
                dateField={section.dateField}
                accentColor={section.accentColor}
                dark={dark}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CardsListModal;
