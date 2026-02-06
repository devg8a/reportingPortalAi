import React from "react";
// import { MoreVertical, Search, Plus } from "lucide-react";

function ClientList() {
  return (
    <div className="client-page">
      {/* Header */}
      <div className="client-header">
        <h1 className="title">Client List</h1>

        <div className="header-actions">
          <div className="search-box">
            {/* <Search size={16} className="search-icon" /> */}
            <input placeholder="Search" />
          </div>

          <select>
            <option>User : Ari Simchi</option>
          </select>

          <select>
            <option>Type : Paid Media</option>
          </select>

          <button className="add-btn">
            {/* <Plus size={16} /> Add Client */}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className="tab active">
          <span className="dot green" />
          Active (10 Client)
        </button>
        <button className="tab">
          <span className="dot gray" />
          Inactive (15 Client)
        </button>
      </div>

      {/* Cards */}
      <div className="card-grid">
        {[1, 2, 3, 4].map((i) => (
          <div className="client-card" key={i}>
            {/* Top */}
            <div className="card-top">
              <div className="card-left">
                <div className="avatar">CN</div>

                <div>
                  <div className="card-title">
                    <h2>Client Store Name</h2>
                    <span className="badge invited">Invited</span>
                    <span className="badge paid">Paid Media</span>
                  </div>

                  <div className="meta">
                    <span>Otaner Kind</span>
                    <span>Otaner@liverpooljeans.com</span>
                    <span>Others</span>
                  </div>
                </div>
              </div>

              {/* <MoreVertical className="menu-icon" /> */}
            </div>

            {/* Account Manager */}
            <div className="manager-row">
              <div className="managers">
                <span className="label">Account Manager</span>
                <span className="circle green">AS</span>
                <span className="circle pink">MT</span>
                <span className="circle yellow">KM</span>
                <span className="circle purple">AS</span>
              </div>

              <div className="dates">
                <span className="date-box">Dec 2024 to Present</span>
                <span className="date-box success">
                  12 Months 1 Week
                </span>
              </div>
            </div>

            {/* Networks */}
            <div className="networks">
              <p>Connected Paid Media Networks</p>
              <div className="network-icons">
                <div />
                <div />
                <div className="add-network">+</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClientList;