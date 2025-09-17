"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/public/services/supabaseClient";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EyeIcon } from "@heroicons/react/24/outline";

// Helper: Calculate average and median
function calcStats(values) {
  if (!values || values.length === 0) return { avg: 0, median: 0 };
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { avg: Number(avg.toFixed(2)), median: Number(median.toFixed(2)) };
}

// Helper: fetch all rows in chunks (avoids 1000 row cap)
async function fetchAllRows(tableName, chunkSize = 1000) {
  let allRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + chunkSize - 1);

    if (error) throw error;

    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);

    if (data.length < chunkSize) break; // last batch reached
    from += chunkSize;
  }

  return allRows;
}

export default function Home() {
  const [placements, setPlacements] = useState([]);
  const [campusStats, setCampusStats] = useState([]);

  const [view, setView] = useState("overall");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("students");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [selectedRange, setSelectedRange] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [offers, campuses] = await Promise.all([
          fetchAllRows("Offer"),
          fetchAllRows("Campus_Data"),
        ]);

        setPlacements(offers);

        const stats = campuses.map((row) => ({
          campus: row.Campus,
          students: row.Students,
        }));
        setCampusStats(stats);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getBranch = (reg) => (reg ? reg.substring(2, 5) : "UNK");

  const getCtcRange = (ctc) => {
    if (ctc < 5) return "<5";
    if (ctc < 10) return "5-10";
    if (ctc < 15) return "10-15";
    if (ctc < 20) return "15-20";
    if (ctc < 30) return "20+";
    return "30+";
  };

  const companyStats = useMemo(() => {
    const stats = {};
    placements.forEach((p) => {
      const comp = p.company || "Unknown";
      if (!stats[comp]) {
        stats[comp] = {
          company: comp,
          total: 0,
          month: new Date(p.created_at).toLocaleString("default", {
            month: "short",
            year: "numeric",
          }),
          ctc: 0,
          ctcRange: "",
        };
      }
      const ctc = Number(p.ctc) || 0;
      stats[comp].total++;
      stats[comp].ctc = ctc;
      stats[comp].ctcRange = getCtcRange(ctc);
    });
    return Object.values(stats);
  }, [placements]);

  const branchStats = useMemo(() => {
    const stats = {};
    placements.forEach((p) => {
      const branch = getBranch(p.reg_no);
      if (!stats[branch]) stats[branch] = { branch, total: 0, ctcValues: [] };
      stats[branch].total++;
      stats[branch].ctcValues.push(Number(p.ctc) || 0);
    });
    return Object.values(stats).map((b) => ({
      ...b,
      ...calcStats(b.ctcValues),
    }));
  }, [placements]);

  const monthlyTrends = useMemo(() => {
    const stats = {};
    placements.forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = d.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      if (!stats[key]) stats[key] = { month: label, total: 0 };
      stats[key].total++;
    });
    return Object.values(stats);
  }, [placements]);

  const filterAndSort = (data, type) => {
    let filtered = data;
    if (search) {
      filtered = data.filter((d) =>
        (type === "company" ? d.company : d.branch)
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    if (type === "company" && selectedRange !== "all") {
      filtered = filtered.filter((d) => d.ctcRange === selectedRange);
    }
    if (sortBy === "students") {
      return [...filtered].sort((a, b) => b.total - a.total);
    } else if (sortBy === "avg") {
      return [...filtered].sort((a, b) => (b.avg || 0) - (a.avg || 0));
    } else if (sortBy === "median") {
      return [...filtered].sort((a, b) => (b.median || 0) - (a.median || 0));
    }
    return filtered;
  };

  const filteredCompanies = filterAndSort(companyStats, "company");
  const filteredBranches = filterAndSort(branchStats, "branch");

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <p>Loading data...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8 relative">
      {/* Header with Eye button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-center flex-1">
          Placement Tracker
        </h1>
        <button
          onClick={() => setShowDisclaimer(true)}
          className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"
          title="View Disclaimer"
        >
          <EyeIcon className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mb-6 space-x-4">
        {["overall", "company", "branch"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setView(tab);
              setSearch("");
            }}
            className={`px-4 py-2 rounded-lg transition ${
              view === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Search & Sort Bar */}
      {view !== "overall" && (
        <div className="flex flex-col md:flex-row justify-center mb-6 space-y-2 md:space-y-0 md:space-x-4">
          <input
            type="text"
            placeholder={`Search ${view}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 w-72 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 w-48 rounded-lg bg-gray-800 border border-gray-600 text-white"
          >
            <option value="students">Sort by Students</option>
            <option value="avg">Sort by Avg CTC</option>
            <option value="median">Sort by Median CTC</option>
          </select>
          {view === "company" && (
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="px-4 py-2 w-48 rounded-lg bg-gray-800 border border-gray-600 text-white"
            >
              <option value="all">All CTC Ranges</option>
              <option value="<5">&lt; 5 LPA</option>
              <option value="5-10">5 - 10 LPA</option>
              <option value="10-15">10 - 15 LPA</option>
              <option value="15-20">15 - 20 LPA</option>
              <option value="20+">20 - 30 LPA</option>
              <option value="30+">30+ LPA</option>
            </select>
          )}
        </div>
      )}

      {/* ====================== OVERALL VIEW ====================== */}
      {view === "overall" && (
        <div className="space-y-12">
          {/* Overall Stats */}
          <div className="text-center space-y-2 mb-6">
            {(() => {
              const ctcValues = placements.map((p) => Number(p.ctc) || 0);
              const { avg, median } = calcStats(ctcValues);
              return (
                <>
                  <div className="text-xl">
                    Total Offers: {placements.length}
                  </div>
                  <div className="text-lg text-gray-300">
                    Avg CTC: <span className="text-green-400">{avg} LPA</span> |{" "}
                    Median CTC:{" "}
                    <span className="text-blue-400">{median} LPA</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Monthly Trends */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Monthly Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="month" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Campus vs Students Bar Chart */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Campus-wise Placement
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campusStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="campus" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip />
                <Bar dataKey="students" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Branch Overview */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Branch Overview
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="branch" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip />
                <Bar dataKey="total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ====================== COMPANY VIEW ====================== */}
      {view === "company" && (
        <div className="space-y-8">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredCompanies}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis
                dataKey="company"
                stroke="#ccc"
                interval={0}
                tickFormatter={(value) =>
                  value.length > 10 ? value.slice(0, 10) + "…" : value
                }
                tick={{ angle: -90, textAnchor: "end", fill: "#ccc" }}
                height={80}
              />
              <YAxis stroke="#ccc" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  borderColor: "#374151",
                }}
                labelStyle={{ color: "#fff" }}
                formatter={(value) => [`${value} Students`, "Placements"]}
              />
              <Bar dataKey="total" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((c, idx) => {
              const companyPlacements = placements.filter(
                (p) => p.company === c.company
              );
              const branchDist = companyPlacements.reduce((acc, p) => {
                const branch = getBranch(p.reg_no);
                acc[branch] = (acc[branch] || 0) + 1;
                return acc;
              }, {});
              const branchArray = Object.entries(branchDist).map(
                ([branch, count]) => ({ branch, count })
              );

              return (
                <div
                  key={c.company + idx}
                  className="bg-gray-800 p-4 rounded-xl shadow hover:scale-105 transition"
                >
                  <h2 className="text-xl font-bold mb-2">{c.company}</h2>
                  <p className="mb-2">Total Students: {c.total}</p>
                  <p className="mb-2 text-sm text-gray-400">Month: {c.month}</p>
                  <p className="text-sm text-gray-300 mb-2">
                    CTC: <span className="text-green-400">{c.ctc} LPA</span>
                  </p>

                  <details className="bg-gray-900 rounded-lg p-2 cursor-pointer">
                    <summary className="text-sm text-gray-300 hover:text-white mb-2">
                      Branch Distribution
                    </summary>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                      {branchArray.map((b, i) => (
                        <div
                          key={i}
                          className="flex justify-between bg-gray-700 rounded-md px-2 py-1 text-sm"
                        >
                          <span>{b.branch}</span>
                          <span className="font-bold text-green-400">
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================== BRANCH VIEW ====================== */}
      {view === "branch" && (
        <div className="space-y-8">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredBranches}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="branch" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Tooltip />
              <Bar dataKey="total" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {filteredBranches.map((b, idx) => {
              const branchPlacements = placements.filter(
                (p) => getBranch(p.reg_no) === b.branch
              );
              const companyDist = branchPlacements.reduce((acc, p) => {
                acc[p.company] = (acc[p.company] || 0) + 1;
                return acc;
              }, {});
              const companyArray = Object.entries(companyDist).map(
                ([company, count]) => ({ company, count })
              );

              return (
                <div
                  key={b.branch + idx}
                  className="bg-gray-800 p-4 rounded-xl shadow hover:scale-105 transition text-center"
                >
                  <h2 className="text-xl font-bold mb-2">{b.branch}</h2>
                  <p className="mb-2">{b.total} Students Placed</p>
                  <p className="text-sm text-gray-300 mb-2">
                    Avg: <span className="text-green-400">{b.avg} LPA</span> |{" "}
                    Median:{" "}
                    <span className="text-blue-400">{b.median} LPA</span>
                  </p>

                  <details className="bg-gray-900 rounded-lg p-2 cursor-pointer">
                    <summary className="text-sm text-gray-300 hover:text-white mb-2">
                      Company Distribution
                    </summary>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                      {companyArray.map((c, i) => (
                        <div
                          key={i}
                          className="flex justify-between bg-gray-700 rounded-md px-2 py-1 text-sm"
                        >
                          <span>{c.company}</span>
                          <span className="font-bold text-blue-400">
                            {c.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-gray-900 p-6 rounded-xl max-w-lg text-white shadow-lg space-y-4">
            <h2 className="text-2xl font-bold">Disclaimer</h2>
            <p className="text-sm text-gray-300">
              The data presented in this dashboard is for informational
              purposes only. It may not fully represent the official placement
              statistics. Please verify with the placement cell for accurate
              details.
            </p>
            <button
              onClick={() => setShowDisclaimer(false)}
              className="mt-4 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
