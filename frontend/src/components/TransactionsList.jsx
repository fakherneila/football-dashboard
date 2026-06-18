// frontend/src/components/TransactionsList.jsx
function TransactionsList({ transactions, full }) {
  const displayData = full ? transactions : transactions.slice(0, 5);

  if (!displayData || displayData.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Recent Transactions</div>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>No transactions found</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        📋 Recent Transactions {!full && "(Last 5)"}
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Branch</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.customer_name}</td>
                <td>{tx.branch_name}</td>
                <td>${tx.amount.toLocaleString()}</td>
                <td>{tx.product_category}</td>
                <td>
                  <span
                    style={{
                      color: tx.status === "completed" ? "#4CAF50" : "#FF9800",
                      fontWeight: 500,
                    }}
                  >
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TransactionsList;
