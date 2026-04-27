const fs = require('fs');

let content = fs.readFileSync('client/src/app/dashboard/reports/page.jsx', 'utf8');

// 1. Import useSearchParams
content = content.replace(
  "import { useState, useEffect } from 'react';",
  "import { useState, useEffect } from 'react';\nimport { useSearchParams } from 'next/navigation';"
);

// 2. Add search query and filtered arrays
content = content.replace(
  "  const [filters, setFilters] = useState({",
  `  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('q') || '';

  const filteredGrades = grades.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.student?.profile?.data?.first_name?.toLowerCase().includes(q) ||
      g.student?.profile?.data?.last_name?.toLowerCase().includes(q) ||
      g.student?.profile?.data?.admission_number?.toLowerCase().includes(q) ||
      g.subject?.name?.toLowerCase().includes(q)
    );
  });

  const filteredReportCards = reportCards.filter(rc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rc.student?.profile?.data?.first_name?.toLowerCase().includes(q) ||
      rc.student?.profile?.data?.last_name?.toLowerCase().includes(q) ||
      rc.student?.profile?.data?.admission_number?.toLowerCase().includes(q)
    );
  });

  const filteredPins = pins.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.pin.toLowerCase().includes(q);
  });

  const [filters, setFilters] = useState({`
);

// 3. Update Gradebook map
content = content.replace(
  "{grades.length > 0 ? grades.map((grade) => (",
  "{filteredGrades.length > 0 ? filteredGrades.map((grade) => ("
);

// Update Gradebook empty state message
content = content.replace(
  "{filters.term_id \n                            ? 'No grades found. Select a specific Grade or click \"Compute Results\".' \n                            : 'Select a Term to view the gradebook.'}",
  "{searchQuery ? 'No grades match your search.' : filters.term_id ? 'No grades found. Select a specific Grade or click \"Compute Results\".' : 'Select a Term to view the gradebook.'}"
);

// 4. Update Pins map
content = content.replace(
  "{pins.map((pin) => (",
  "{filteredPins.map((pin) => ("
);
content = content.replace(
  "{pins.length === 0 && (",
  "{filteredPins.length === 0 && ("
);
content = content.replace(
  "No PINs generated yet.",
  "{searchQuery ? 'No PINs match your search.' : 'No PINs generated yet.'}"
);

// 5. Update Report Cards map
content = content.replace(
  "{reportCards.length > 0 ? reportCards.map((rc) => (",
  "{filteredReportCards.length > 0 ? filteredReportCards.map((rc) => ("
);
content = content.replace(
  "{filters.term_id \n                              ? 'No report cards found for this term. Click \"Calculate Ranks\" to process.' \n                              : 'Select a Term to view report cards.'}",
  "{searchQuery ? 'No report cards match your search.' : filters.term_id ? 'No report cards found for this term. Click \"Calculate Ranks\" to process.' : 'Select a Term to view report cards.'}"
);

fs.writeFileSync('client/src/app/dashboard/reports/page.jsx', content);
