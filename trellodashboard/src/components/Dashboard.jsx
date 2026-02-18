import './Dashboard.css';
import MetricCard from './MetricCard';

const Dashboard = ({ metrics }) => {
  if (!metrics) return null;

  const { byPeriod, averageProcessTime, byLabel, byMember, byMemberAndLabel } = metrics;

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">📊 Dashboard de Indicadores</h2>

      {/* Métricas por Período */}
      {byPeriod.map((periodData) => (
        <div key={periodData.period} className="period-section">
          <h3 className="period-title">{periodData.label}</h3>
          
          <div className="metrics-grid">
            <MetricCard
              title="Novos Processos"
              value={periodData.new.count}
              subtitle={`Média: ${periodData.new.average} por dia`}
              color="#28a745"
            />
            
            <MetricCard
              title="Em Andamento"
              value={periodData.inProgress.count}
              subtitle={`Média: ${periodData.inProgress.average} por dia`}
              color="#ffc107"
            />
            
            <MetricCard
              title="Concluídos"
              value={periodData.completed.count}
              subtitle={`Média: ${periodData.completed.average} por dia`}
              color="#007bff"
            />
          </div>
        </div>
      ))}

      {/* Tempo Médio de Processo */}
      <div className="section">
        <h3 className="section-title">⏱️ Tempo Médio de Processos</h3>
        <div className="metrics-grid">
          <MetricCard
            title="Tempo Médio Geral"
            value={`${averageProcessTime} dias`}
            color="#6f42c1"
          />
        </div>
      </div>

      {/* Tempo Médio por Tipo de Processo */}
      {byLabel && byLabel.length > 0 && (
        <div className="section">
          <h3 className="section-title">🏷️ Tempo Médio por Tipo de Processo</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Tempo Médio</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {byLabel.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <span 
                        className="label-badge" 
                        style={{ 
                          backgroundColor: item.label.color || '#ccc' 
                        }}
                      >
                        {item.label.name}
                      </span>
                    </td>
                    <td className="metric-cell">{item.average} dias</td>
                    <td className="count-cell">{item.count} processos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tempo Médio por Pessoa */}
      {byMember && byMember.length > 0 && (
        <div className="section">
          <h3 className="section-title">👤 Tempo Médio por Pessoa</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Tempo Médio</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {byMember.map((item) => (
                  <tr key={item.memberId}>
                    <td className="member-name">{item.memberName}</td>
                    <td className="metric-cell">{item.average} dias</td>
                    <td className="count-cell">{item.count} processos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tempo Médio por Pessoa por Tipo */}
      {byMemberAndLabel && byMemberAndLabel.length > 0 && (
        <div className="section">
          <h3 className="section-title">👤🏷️ Tempo Médio por Pessoa e Tipo</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Tipo</th>
                  <th>Tempo Médio</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {byMemberAndLabel.map((item, index) => (
                  <tr key={index}>
                    <td className="member-name">{item.memberName}</td>
                    <td className="label-name">{item.label}</td>
                    <td className="metric-cell">{item.average} dias</td>
                    <td className="count-cell">{item.count} processos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
