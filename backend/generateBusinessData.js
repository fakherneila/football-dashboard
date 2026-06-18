// backend/generateBusinessData.js
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const db = new sqlite3.Database("./sales.db");

// Read schema
const schemaSQL = fs.readFileSync("./schema_business.sql", "utf8");

db.exec(schemaSQL, (err) => {
  if (err) {
    console.error("Schema error:", err.message);
    process.exit(1);
  }
  console.log("✅ Database schema created");
  generateData();
});

// Regions (replaces leagues)
const REGIONS = [
  { id: 1, name: "North America", territory: "USA & Canada" },
  { id: 2, name: "Europe", territory: "EU & UK" },
  { id: 3, name: "Asia Pacific", territory: "APAC" },
  { id: 4, name: "Latin America", territory: "LATAM" },
  { id: 5, name: "Middle East & Africa", territory: "MEA" },
];

// Branches per region (replaces teams)
const BRANCHES_BY_REGION = {
  "North America": [
    "New York",
    "Los Angeles",
    "Chicago",
    "Toronto",
    "San Francisco",
    "Seattle",
  ],
  Europe: ["London", "Berlin", "Paris", "Amsterdam", "Madrid", "Milan"],
  "Asia Pacific": [
    "Tokyo",
    "Sydney",
    "Singapore",
    "Shanghai",
    "Mumbai",
    "Seoul",
  ],
  "Latin America": [
    "São Paulo",
    "Mexico City",
    "Buenos Aires",
    "Bogotá",
    "Santiago",
  ],
  "Middle East & Africa": [
    "Dubai",
    "Riyadh",
    "Johannesburg",
    "Cairo",
    "Tel Aviv",
  ],
};

// Product categories
const PRODUCT_CATEGORIES = [
  "Enterprise Software",
  "Cloud Services",
  "Consulting",
  "Hardware",
  "Support & Maintenance",
  "Training",
  "Analytics Platform",
  "Security Solutions",
];

// Customer names
const CUSTOMER_NAMES = [
  "TechCorp",
  "Global Industries",
  "Innovate Solutions",
  "Future Systems",
  "Peak Enterprises",
  "Summit Partners",
  "Axis Corporation",
  "Nexus Group",
  "Vanguard Holdings",
  "Prime Ventures",
  "Elite Dynamics",
  "Strategic Works",
];

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateData() {
  console.log("\n📊 Generating Business Intelligence Data...\n");

  const today = new Date().toISOString().slice(0, 10);
  const fiscalYear = 2025;

  // Insert Regions
  for (const region of REGIONS) {
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO regions (id, name, territory, fiscal_year) VALUES (?, ?, ?, ?)`,
        [region.id, region.name, region.territory, fiscalYear],
        () => resolve(),
      );
    });
    console.log(`✅ Region: ${region.name}`);
  }

  // Insert Branches and generate sales data
  let branchId = 1;
  const allBranches = [];

  for (const region of REGIONS) {
    const branches = BRANCHES_BY_REGION[region.name];

    for (const branchName of branches) {
      const revenue = random(500000, 5000000);
      const transactionsCount = random(50, 500);
      const profit = Math.floor((revenue * random(15, 35)) / 100);

      allBranches.push({ id: branchId, name: branchName, regionId: region.id });

      await new Promise((resolve) => {
        db.run(
          `INSERT INTO branches (id, name, region_id, manager, employee_count, established_date)
                        VALUES (?, ?, ?, ?, ?, ?)`,
          [
            branchId,
            branchName,
            region.id,
            `Manager ${branchName}`,
            random(10, 100),
            "2020-01-01",
          ],
          () => resolve(),
        );
      });

      // Insert sales ranking
      await new Promise((resolve) => {
        db.run(
          `INSERT INTO sales_rankings (region_id, branch_id, rank, total_revenue, transactions_count, avg_order_value, total_profit, snapshot_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            region.id,
            branchId,
            0,
            revenue,
            transactionsCount,
            Math.floor(revenue / transactionsCount),
            profit,
            today,
          ],
          () => resolve(),
        );
      });

      // Generate transactions for this branch
      for (let i = 0; i < transactionsCount; i++) {
        const date = new Date();
        date.setDate(date.getDate() - random(0, 30));
        const amount = random(5000, 50000);
        const category =
          PRODUCT_CATEGORIES[
            Math.floor(Math.random() * PRODUCT_CATEGORIES.length)
          ];
        const customer =
          CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)];

        await new Promise((resolve) => {
          db.run(
            `INSERT INTO transactions (branch_id, customer_name, amount, transaction_date, status, product_category, payment_method, profit_margin)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              branchId,
              customer,
              amount,
              date.toISOString().slice(0, 10),
              "completed",
              category,
              "Wire Transfer",
              random(15, 35),
            ],
            () => resolve(),
          );
        });
      }

      console.log(
        `   ✅ Branch: ${branchName} ($${(revenue / 1000000).toFixed(1)}M revenue, ${transactionsCount} deals)`,
      );
      branchId++;
    }
    console.log("");
  }

  // Calculate and update rankings
  for (const region of REGIONS) {
    const branches = await new Promise((resolve) => {
      db.all(
        `SELECT id, total_revenue FROM sales_rankings WHERE region_id = ?`,
        [region.id],
        (err, rows) => {
          resolve(rows);
        },
      );
    });

    branches.sort((a, b) => b.total_revenue - a.total_revenue);

    for (let i = 0; i < branches.length; i++) {
      await new Promise((resolve) => {
        db.run(
          `UPDATE sales_rankings SET rank = ? WHERE id = ?`,
          [i + 1, branches[i].id],
          () => resolve(),
        );
      });
    }
  }

  // Generate top performers
  const topPerformers = [
    {
      name: "Sarah Chen",
      branch: "New York",
      role: "Regional Director",
      sales: 2850000,
      deals: 42,
    },
    {
      name: "Marcus Weber",
      branch: "Berlin",
      role: "Senior Account Exec",
      sales: 2450000,
      deals: 38,
    },
    {
      name: "Elena Rodriguez",
      branch: "São Paulo",
      role: "Sales Manager",
      sales: 2180000,
      deals: 35,
    },
    {
      name: "James Wilson",
      branch: "London",
      role: "Enterprise Sales",
      sales: 1950000,
      deals: 31,
    },
    {
      name: "Yuki Tanaka",
      branch: "Tokyo",
      role: "Business Development",
      sales: 1780000,
      deals: 28,
    },
  ];

  for (const performer of topPerformers) {
    const branch = await new Promise((resolve) => {
      db.get(
        `SELECT id FROM branches WHERE name = ?`,
        [performer.branch],
        (err, row) => {
          resolve(row);
        },
      );
    });

    if (branch) {
      await new Promise((resolve) => {
        db.run(
          `INSERT INTO top_performers (name, branch_id, role, total_sales, deals_count, achievement_percent, snapshot_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            performer.name,
            branch.id,
            performer.role,
            performer.sales,
            performer.deals,
            random(85, 150),
            today,
          ],
          () => resolve(),
        );
      });
    }
  }

  console.log("🏆 Top performers added\n");
  console.log("🎉 Business Intelligence data generation complete!");
  db.close();
}
