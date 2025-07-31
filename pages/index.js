import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("Offer").select("*");
      if (error) console.error(error);
      else setOffers(data);
    };
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Placement Offers</h1>
      <ul>
        {offers.map((offer) => (
          <li key={offer.id}>
            {offer.reg_no} - {offer.company} - {offer.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
