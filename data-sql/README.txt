Al Shifa: DATA (staff, dawaiyan, treatments, inventory) ke chhote SQL parts.

PEHLE: Supabase ka backup lein. Pehle TEST project par chalayein, phir asli par.
In files mein comments nahi hain, taake paste karte waqt kharab na hon. Har file ek ek karke paste karke Run karein.
Tarteeb: DATA-1, DATA-2a, DATA-2b, DATA-3a, DATA-3b, DATA-3c, DATA-3d, DATA-4a, DATA-4b, DATA-4c.
Har file ke baad "Success" aana chahiye. Dobara chalane se kuch double nahi banta (naam se match karke sirf wo cheezein jorti hain jo pehle se nahi hain).
Koi purani cheez badalti ya hatati nahi. Qeemat, stock, mareez, payment ko haath nahi lagata.

DATA-1-staff.sql     : 4 staff (Dr. Sachin 40,000, Dr. Shamshad Bibi 40,000, Shahid 20,000, Zahid 20,000) + tankhwah ki tareekh 5 (sirf agar pehle se tay nahi).
                       Login ya PIN nahi banta: PIN Staff screen se khud set karein.
DATA-2a/2b           : 83 dental dawaiyan (naam, strength, form). Dose aur muddat khali (doctor likhta hai). Greymax, Arinac pack dekh kar theek karein.
DATA-3a/3b/3c/3d     : 75 treatments (3d mein Bridge ki types PFM, E-max, Zirconia, Porcelain, Veneer, Flexible aur Cast Partial Denture: qeemat 0, Price List mein khud bharein). PDF wali fee jahan ek rate hai wahi; jahan range hai wahan sab se kam rate aur note mein poori range.
                       Jin ki fee PDF mein nahi, unki fee 0, doctor khud bharega (Price List mein).
DATA-4a/4b/4c        : 142 inventory items, stock 0. Qeemat / miqdar / supplier khali: khareedari app se darj karein.

Agar pehle se koi naam alag tarah likha ho (jaise "Dr Sachin") to staff dobara aa sakta hai: pehle Staff screen dekh lein.
