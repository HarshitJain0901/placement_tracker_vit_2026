import { createClient } from "@/public/services/supabaseClient.js";

async function getOffers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Offer")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching offers:", error.message);
    // In a real app, you'd want to handle this error more gracefully
    return [];
  }

  return data;
}

export default async function TrackerPage() {
  const offers = await getOffers();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Placement Offers</h1>
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">
                Name
              </th>
              <th scope="col" className="px-6 py-3">
                Registration No.
              </th>
              <th scope="col" className="px-6 py-3">
                Company
              </th>
              <th scope="col" className="px-6 py-3">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.length > 0 ? (
              offers.map((offer) => (
                <tr
                  key={offer.id}
                  className="bg-white border-b hover:bg-gray-50"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {offer.name}
                  </td>
                  <td className="px-6 py-4">{offer.reg_no}</td>
                  <td className="px-6 py-4">{offer.company}</td>
                  <td className="px-6 py-4">
                    {new Date(offer.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center px-6 py-4">
                  No offers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
