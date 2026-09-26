import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen, LogIn, LayoutDashboard, Wallet, ShoppingCart, Wrench, Receipt, FileText, Shield,
  Boxes, Users, Banknote, ShieldCheck, Settings, Sun, HelpCircle, Lightbulb, AlertTriangle, ArrowRight,
} from "lucide-react";

// Public, shareable user manual — lives outside the (app) group so it needs
// no login. Kept out of search results; it's meant to be shared by link.
export const metadata: Metadata = {
  title: "User Manual",
  description: "Step-by-step guide to using M-Fixpro POS — sales, repair jobs, stock, customers, finance and settings.",
  alternates: { canonical: "/manual" },
  robots: { index: false, follow: false },
};

const toc = [
  { id: "welcome", label: "Welcome", icon: BookOpen },
  { id: "roles", label: "Who can do what", icon: Users },
  { id: "sign-in", label: "Signing in", icon: LogIn },
  { id: "screen", label: "Finding your way", icon: LayoutDashboard },
  { id: "shifts", label: "Shifts (open & close)", icon: Wallet },
  { id: "pos", label: "Making a sale (POS)", icon: ShoppingCart },
  { id: "jobs", label: "Repair jobs", icon: Wrench },
  { id: "bill-job", label: "Billing a finished job", icon: Receipt },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "quotations", label: "Quotations", icon: FileText },
  { id: "warranty", label: "Warranty", icon: Shield },
  { id: "inventory", label: "Stock & products", icon: Boxes },
  { id: "contacts", label: "Customers & suppliers", icon: Users },
  { id: "finance", label: "Finance", icon: Wallet },
  { id: "salary", label: "Salary", icon: Banknote },
  { id: "audit-log", label: "Audit log", icon: ShieldCheck },
  { id: "settings", label: "Settings & team", icon: Settings },
  { id: "daily", label: "A normal day", icon: Sun },
  { id: "faq", label: "Questions & problems", icon: HelpCircle },
];

/* ---------- small building blocks ---------- */

function Section({ id, title, icon: Icon, intro, children }: {
  id: string;
  title: string;
  icon: React.ElementType;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-10 first:pt-0">
      <h2 className="font-prata text-xl sm:text-2xl text-ink flex items-center gap-3 mb-2">
        <span className="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center shrink-0">
          <Icon size={18} />
        </span>
        {title}
      </h2>
      {intro && <p className="text-zinc-600 mb-5">{intro}</p>}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="nexora-card p-4 sm:p-5">
      <h3 className="font-prata text-base text-ink mb-3">{title}</h3>
      <div className="space-y-3 text-zinc-700">{children}</div>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-2" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-green-50 border border-green-200 text-green-900 px-3.5 py-2.5 text-sm">
      <Lightbulb size={16} className="shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 text-sm">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// A UI label the reader should look for on screen, e.g. a button or menu item.
function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-ink bg-zinc-100 rounded px-1.5 py-0.5 text-[13px] whitespace-nowrap">{children}</strong>;
}

function Menu({ path }: { path: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {path.map((p, i) => (
        <span key={p} className="inline-flex items-center gap-1">
          {i > 0 && <ArrowRight size={12} className="text-zinc-400" />}
          <B>{p}</B>
        </span>
      ))}
    </span>
  );
}

function Flow({ steps }: { steps: { label: string; note: string; color: string }[] }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-stretch">
      {steps.map((s, i) => (
        <div key={s.label} className="flex sm:flex-col items-center sm:items-stretch gap-2 sm:flex-1 sm:min-w-[120px]">
          <div className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} /> {s.label}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.note}</p>
          </div>
          {i < steps.length - 1 && <ArrowRight size={14} className="text-zinc-300 shrink-0 rotate-90 sm:hidden" />}
        </div>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function ManualPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-[15px] leading-relaxed">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/shop_logo/1_M.png" alt="M-Fixpro" width={36} height={36} className="w-9 h-9 object-contain" />
            <div className="min-w-0">
              <p className="font-prata text-ink leading-tight truncate">M-Fixpro POS</p>
              <p className="text-xs text-zinc-500 leading-tight">User Manual</p>
            </div>
          </div>
          <Link
            href="/auth/login"
            target="_blank"
            rel="noopener noreferrer"
            className="nexora-btn nexora-btn-primary text-sm shrink-0"
          >
            <LogIn size={14} /> Open the system
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <p className="text-brand text-xs font-medium uppercase tracking-widest mb-2">Staff guide</p>
          <h1 className="font-prata text-3xl sm:text-4xl text-ink mb-3">How to use M-Fixpro POS</h1>
          <p className="text-zinc-600 max-w-2xl">
            A simple, step-by-step guide for everyone at the shop. It explains what each screen does,
            which buttons to press, and what happens after you press them. You don&apos;t need to read it all at
            once. Jump to the part you need from the list of contents.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 lg:flex lg:gap-10">
        {/* Contents — sticky sidebar on desktop, collapsible on mobile */}
        <aside className="lg:w-56 shrink-0 mb-8 lg:mb-0">
          <details className="lg:hidden nexora-card p-4" open={false}>
            <summary className="font-prata text-sm cursor-pointer">Contents</summary>
            <nav className="mt-3 grid grid-cols-1 gap-1">
              {toc.map((t) => (
                <a key={t.id} href={`#${t.id}`} className="text-sm text-zinc-600 hover:text-brand py-1">{t.label}</a>
              ))}
            </nav>
          </details>
          <nav className="hidden lg:block sticky top-24 space-y-0.5 max-h-[calc(100vh-7rem)] overflow-y-auto sidebar-nav-scroll">
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2 px-3">Contents</p>
            {toc.map((t) => {
              const Icon = t.icon;
              return (
                <a key={t.id} href={`#${t.id}`}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded text-sm text-zinc-600 hover:text-brand hover:bg-brand-light transition-colors">
                  <Icon size={14} /> {t.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 max-w-3xl">
          {/* ---------------- Welcome ---------------- */}
          <Section id="welcome" title="Welcome" icon={BookOpen}
            intro="M-Fixpro POS is the shop's all-in-one system. Everything the shop does day to day happens here:">
            <Sub title="What the system does">
              <Bullets items={[
                <><b>Selling</b>: ring up products, take payment by cash, card, transfer or KokoPay, and print or email the bill.</>,
                <><b>Repairs</b>: write a job note when a customer drops off a device, track the repair, then bill it when it&apos;s fixed.</>,
                <><b>Stock</b>: know exactly how many of each item you have, in the store room and in the showroom.</>,
                <><b>Customers and suppliers</b>: keep contacts, loyalty points, and what the shop owes each supplier.</>,
                <><b>Money</b>: cash drawer shifts, expenses, profit, and staff salary.</>,
              ]} />
            </Sub>
            <Tip>
              In this manual, words in a grey box such as <B>New Sale</B> are the exact button or menu name you
              will see on screen. An arrow such as <Menu path={["Inventory", "Products"]} /> means &quot;open
              Inventory in the menu, then click Products&quot;.
            </Tip>
          </Section>

          {/* ---------------- Roles ---------------- */}
          <Section id="roles" title="Who can do what" icon={Users}
            intro="Every person gets their own login. What you see in the menu depends on your role. If a page is missing from your menu, you don't have access to it. Ask your Admin.">
            <div className="nexora-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-zinc-200 bg-zinc-50">
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Usually does</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr><td className="px-4 py-2.5 font-medium">Admin</td><td className="px-4 py-2.5 text-zinc-600">Runs the shop. Can see and do everything: add staff, change shop details, pay salaries, reverse bills, view finance and the audit log.</td></tr>
                  <tr><td className="px-4 py-2.5 font-medium">Manager</td><td className="px-4 py-2.5 text-zinc-600">Everything a cashier does, plus receiving stock (GRN), moving stock, stock out, the Finance page, reviewing shifts, and adding expenses.</td></tr>
                  <tr><td className="px-4 py-2.5 font-medium">Cashier</td><td className="px-4 py-2.5 text-zinc-600">Opens and closes shifts, makes sales, takes in repair jobs, bills finished jobs, and makes quotations.</td></tr>
                  <tr><td className="px-4 py-2.5 font-medium">Technician</td><td className="px-4 py-2.5 text-zinc-600">Works on repair jobs and updates their status (Pending, Ongoing, Done…).</td></tr>
                  <tr><td className="px-4 py-2.5 font-medium">Staff</td><td className="px-4 py-2.5 text-zinc-600">General staff. Gets the basic pages.</td></tr>
                </tbody>
              </table>
            </div>
            <Tip>
              These are only the starting settings. An Admin can switch individual pages and actions on or off for
              each person. See <a href="#settings" className="underline">Settings &amp; team</a>.
            </Tip>
          </Section>

          {/* ---------------- Sign in ---------------- */}
          <Section id="sign-in" title="Signing in" icon={LogIn}>
            <Sub title="Sign in">
              <Steps items={[
                <>Open <b>mfixpro.vercel.app</b> in your browser (Chrome is best). It works on a computer, tablet or phone.</>,
                <>Type the <b>email</b> and <b>password</b> your Admin gave you.</>,
                <>Wait for the small security check box to show a tick. It checks that you&apos;re a real person and usually finishes on its own.</>,
                <>Press <B>Sign in</B>. You will land on the <b>Dashboard</b>.</>,
              ]} />
              <Warn>
                If you see <i>&quot;Your account has been disabled&quot;</i>, your Admin has switched your account off.
                Please contact them.
              </Warn>
            </Sub>
            <Sub title="Forgot your password?">
              <Steps items={[
                <>On the sign-in screen, press <B>Forgot password?</B></>,
                <>Enter your email, complete the security check, and press <B>Send code</B>.</>,
                <>Check your email for a <b>6-digit code</b>.</>,
                <>Type the code, then your new password twice (at least 6 characters), and press <B>Reset password</B>.</>,
                <>You go back to the sign-in screen. Sign in with the new password.</>,
              ]} />
            </Sub>
            <Sub title="Your profile & signing out">
              <Bullets items={[
                <>Click your <b>name at the bottom of the menu</b> to open <B>My Profile</B>. There you can change your display name, phone, email and password.</>,
                <>Press <B>Sign out</B> (under your name) when you finish, especially on a shared computer.</>,
              ]} />
            </Sub>
          </Section>

          {/* ---------------- Screen ---------------- */}
          <Section id="screen" title="Finding your way" icon={LayoutDashboard}>
            <Sub title="The menu">
              <Bullets items={[
                <><b>On a computer</b>: the menu is always on the left.</>,
                <><b>On a phone or tablet</b>: tap the <b>☰ button</b> at the top-left to open the menu. Tap outside it to close.</>,
                <>Groups such as <B>Sales</B>, <B>Inventory</B>, <B>Contacts</B>, <B>Finance</B> and <B>System</B> open when you click them and show more pages inside.</>,
                <>The top of the screen always shows today&apos;s date and time.</>,
              ]} />
            </Sub>
            <Sub title="The Dashboard">
              <p>The first page after signing in. It gives a quick picture of the shop:</p>
              <Bullets items={[
                <><b>Today&apos;s Revenue</b>, <b>Today&apos;s Profit</b>, <b>Average Order Value</b>, and total sales, products and customers.</>,
                <>A chart of the <b>last 7 days</b> of sales and a breakdown of <b>payment methods</b> for the last 30 days.</>,
                <><b>Sales by Category</b>, <b>Staff Performance</b>, <b>Top Products</b> and <b>Recent Sales</b>.</>,
                <>A <b>low stock</b> list showing items that are running out (or &quot;All stocked up&quot; when nothing is low).</>,
                <>Quick buttons: <B>New Sale</B>, <B>Add Product</B>, <B>Warranties</B>.</>,
              ]} />
              <p className="text-sm text-zinc-500">You don&apos;t need to do anything here. It is for information only.</p>
            </Sub>
          </Section>

          {/* ---------------- Shifts ---------------- */}
          <Section id="shifts" title="Shifts: opening and closing the cash drawer" icon={Wallet}
            intro="A shift is one person's working session at the cash drawer. You must open a shift before you can sell anything. It lets the system check at the end of the day that the cash in the drawer is correct.">
            <Sub title="Open a shift (start of your work)">
              <Steps items={[
                <>Go to <B>POS / New Sale</B>.</>,
                <>At the top you&apos;ll see a yellow button <B>No open shift — tap to open</B>. Press it.</>,
                <>In <b>Opening cash float</b>, type how much cash is in the drawer right now, for example <b>5000</b>.</>,
                <>Optionally add a note (for example &quot;Morning shift&quot;) and confirm.</>,
                <>The yellow button changes to show your shift number and today&apos;s cash and card totals. You can now sell.</>,
              ]} />
            </Sub>
            <Sub title="Close a shift (end of your work)">
              <Steps items={[
                <>On <B>POS / New Sale</B>, press the shift button at the top (it says <B>Close Shift</B>).</>,
                <>Count all the cash in the drawer and type the total into <b>counted cash</b>.</>,
                <>Add a note if something was unusual, then confirm.</>,
                <>The system shows three numbers: <b>Expected cash</b> (float + cash sales − cash paid out), <b>Counted cash</b> (what you typed), and the <b>Variance</b> (the difference).</>,
              ]} />
              <Tip>A variance of <b>0</b> means the drawer is exactly right. A minus number means cash is short. A plus number means there is extra cash.</Tip>
              <Warn>Close your own shift before you go home. If a shift is left open, only an Admin can force-close it from the Finance page.</Warn>
            </Sub>
          </Section>

          {/* ---------------- POS ---------------- */}
          <Section id="pos" title="Making a sale (POS)" icon={ShoppingCart}
            intro="Menu: POS / New Sale. The left side shows the products you can sell. The right side is the customer's cart and the payment area.">
            <Sub title="Step by step: selling products">
              <Steps items={[
                <>Make sure your <b>shift is open</b> (see above).</>,
                <><b>Find the product.</b> Type its name or SKU in the search box, or narrow the list with the category boxes. The number on each product card shows how many are in the showroom.</>,
                <><b>Tap the product</b> to add it to the cart.
                  <div className="mt-2 space-y-1 text-sm text-zinc-600">
                    <p>• If a small window asks for a <b>batch</b>, choose <B>Auto (FIFO)</B> (it sells the oldest stock first, which is the normal choice) or a specific batch. A red <i>&quot;Selling at a loss&quot;</i> label warns you that the price is below cost.</p>
                    <p>• For items with <b>serial numbers</b> (laptops, phones…), tick the exact unit(s) you are handing to the customer, then press <B>Add to Cart</B>.</p>
                  </div>
                </>,
                <><b>Change quantity</b> with the <b>−</b> and <b>+</b> buttons. Type a per-item <b>Discount</b> if needed. Remove a line with the <b>×</b>.</>,
                <><b>Choose the customer</b> (optional). Press <B>Walk-in customer (tap to select)</B>, search by name or phone, and tap them. If they are new, press <B>New Customer</B> and enter their name and phone. Leave it as walk-in if they don&apos;t want to give details.</>,
                <><b>Bill discount</b>: to give a discount on the whole bill, type it in the <b>Bill Discount</b> box.</>,
                <><b>Choose how they pay</b>: <B>Cash</B>, <B>Card</B>, <B>Transfer</B> or <B>KokoPay</B>. For cash, type the <b>Amount tendered</b> and the system shows the <b>Change</b> to give back.</>,
                <>Press <B>Checkout — Rs. …</B>.</>,
                <>The receipt appears. You can <b>Print</b> it, <b>Download</b> it as a PDF, or <b>Email</b> it to the customer if they have an email address.</>,
              ]} />
              <p className="text-sm text-zinc-600">
                <b>What happens after checkout:</b> stock goes down automatically, a warranty record is created for any item that
                has a warranty, the customer&apos;s loyalty points are updated, and the money is added to your shift. If an item is
                now running low, the shop gets an email alert.
              </p>
            </Sub>
            <Sub title="Paying with two methods (split payment)">
              <Steps items={[
                <>Tap more than one payment button, for example <B>Cash</B> and <B>Card</B>.</>,
                <>An amount box appears for each. Type how much is paid each way.</>,
                <>The line below must say <b className="text-green-700">Balanced</b>. If it says <i>Remaining</i> or <i>Over by</i>, fix the amounts.</>,
                <>Press <B>Checkout</B>.</>,
              ]} />
            </Sub>
            <Sub title="KokoPay (pay in instalments)">
              <Steps items={[
                <>Press <B>KokoPay</B>. A box asks for the <b>surcharge %</b>. Type it and confirm.</>,
                <>Each item price in the cart goes up by that % automatically. The customer&apos;s bill shows the higher prices with no separate fee line.</>,
                <>To change the %, press <B>Edit %</B>. KokoPay cannot be combined with another payment method.</>,
              ]} />
            </Sub>
            <Sub title="Card charge %">
              <Steps items={[
                <>Press <B>Card</B>. A box asks for the <b>surcharge %</b> (for example the bank&apos;s card fee). Type it and confirm, or leave it empty for no charge.</>,
                <>Just like KokoPay, each item price goes up by that % and the bill shows no separate fee line.</>,
                <>To change it, press <B>Edit %</B> or press <B>Card</B> again.</>,
                <><b>Part cash, part card</b>: after choosing Card (with its %), also press <B>Cash</B>. Type only the <b>Cash</b> amount. The <b>Card</b> amount fills in by itself: the rest of the bill <b>plus the % on that card part only</b>. Swipe exactly that amount. (No % yet? Press <B>+ Add card charge %</B>.)</>,
              ]} />
            </Sub>
            <Sub title="Loyalty points">
              <Bullets items={[
                <>A customer earns <b>1 point for every Rs. 100</b> spent. Walk-in customers don&apos;t earn points.</>,
                <><b>1 point = Rs. 1 off.</b> When a customer with points is selected, a <b>Redeem Points</b> box appears. Type how many points to use.</>,
                <>Before checkout, the cart shows <b>Points after this sale</b> so you can tell the customer.</>,
              ]} />
            </Sub>
            <Warn>
              The POS only shows products that are in the <b>Showroom</b>. If an item is in the store room but not showing
              here, it first needs a <a href="#inventory" className="underline">Stock Transfer</a> to the showroom.
            </Warn>
          </Section>

          {/* ---------------- Jobs ---------------- */}
          <Section id="jobs" title="Repair jobs" icon={Wrench}
            intro="Menu: Jobs. Use this when a customer brings in a device to be repaired. Each job gets a Job No. (for example JOB-0001) and moves through these stages:">
            <Flow steps={[
              { label: "Job Pending", note: "Received, not started", color: "bg-amber-400" },
              { label: "Ongoing Job", note: "Being repaired", color: "bg-zinc-400" },
              { label: "Job Done", note: "Fixed, waiting for pickup", color: "bg-green-500" },
              { label: "Delivered", note: "Paid & handed back", color: "bg-blue-500" },
            ]} />
            <p className="text-sm text-zinc-600">If a device can&apos;t be fixed, set it to <b className="text-red-600">Can&apos;t Repair</b> instead.</p>

            <Sub title="Step by step: taking in a device (new job note)">
              <Steps items={[
                <>Press <B>New Job</B>. The Job No. is filled in for you. Leave it as it is unless you need a special number.</>,
                <><b>Customer</b>: search for an existing customer by name or phone and tap them, or type the details for a new one. <b>Name</b> and <b>mobile number</b> are required. Add an <b>email</b> if you want to send them updates.</>,
                <><b>Device</b>: pick the type (Laptop, Desktop, Printer, Monitor, CCTV or Other), then fill in brand, model, serial number and colour.</>,
                <><b>Device Parts</b> (recommended): tap quick buttons such as <B>+ RAM</B> or <B>+ SSD</B>, and write the spec and serial number. This proves the same parts go back to the customer.</>,
                <><b>Fault description</b>: write what the customer says is wrong. This is <b>required</b>.</>,
                <><b>Accessories</b>: tick what they left with the device (charger, bag, battery…). <b>Physical condition</b>: tick any scratches, cracks, liquid damage and so on.</>,
                <>Optionally <b>assign a technician</b>, add <b>Services &amp; Charges</b> (for example &quot;Replace SSD Rs. 12,000&quot;, or a free service with a reason), an <b>estimated cost</b>, an <b>advance paid</b>, and the <b>expected delivery date</b>.</>,
                <>Press <B>Save Job Note</B>.</>,
                <>The job opens. Press <B>Print A4</B> and give the customer their copy as a receipt, or <B>Download</B> it as a PDF.</>,
                <>If the customer has an email, the system asks <i>&quot;Send this job confirmation by email?&quot;</i>. Press <B>Send Email</B> to send it.</>,
              ]} />
              <Tip>Any <b>advance paid</b> is taken off automatically when the job is billed later, so the customer only pays the balance.</Tip>
            </Sub>

            <Sub title="Step by step: updating a job">
              <Steps items={[
                <>In <B>Jobs</B>, find the job. Search by job no., customer name or phone, or filter by status or date.</>,
                <>Press the <b>eye icon</b> to open it.</>,
                <>Under <b>Update Job Status</b>, choose the new status.</>,
                <>When the repair is finished, choose <B>Job Done</B> and type the final <b>Repair cost</b>. If you added services, you can press <B>Use services total</B> to fill it in.</>,
                <>Write a short note about what was done, then press <B>Save Update</B>.</>,
                <>If the customer has an email, you can send them the status update by email.</>,
              ]} />
              <p className="text-sm text-zinc-600">Every update is saved in <b>Job History</b> with the date and the name of the person who made it.</p>
            </Sub>

            <Sub title="Other things you can do">
              <Bullets items={[
                <><B>Edit Job</B>: correct mistakes in the customer or device details. Only people with permission see this button.</>,
                <><B>Export Report</B>: download a spreadsheet (CSV) of jobs and their full history. Use the status and date filters first to choose which jobs.</>,
              ]} />
            </Sub>
          </Section>

          {/* ---------------- Bill a job ---------------- */}
          <Section id="bill-job" title="Billing a finished job" icon={Receipt}
            intro="When the customer comes to collect a repaired device, you take payment on the POS screen.">
            <Sub title="Step by step">
              <Steps items={[
                <>Make sure the job is set to <B>Job Done</B> with a repair cost (see above).</>,
                <>Go to <B>POS / New Sale</B> and press <B>Find Job to Bill</B>.</>,
                <>Search by job no., customer name or mobile number, and tap the job.</>,
                <>The job&apos;s charges appear in the cart: services, any repair charge, and <b>&quot;Less: advance paid&quot;</b> if the customer paid something at drop-off.</>,
                <>If they are also buying products (for example a new mouse), add those too. Everything goes on one bill.</>,
                <>Choose the payment method and press <B>Checkout</B>. Print or email the bill.</>,
              ]} />
              <p className="text-sm text-zinc-600"><b>What happens:</b> the job is automatically changed to <b>Delivered</b> and can&apos;t be billed twice.</p>
              <Tip>Only jobs marked <b>Job Done</b> appear in <B>Find Job to Bill</B>. If a job is missing, check its status first.</Tip>
            </Sub>
          </Section>

          {/* ---------------- Bills ---------------- */}
          <Section id="bills" title="Bills" icon={Receipt}
            intro="Menu: Sales → Bills. A list of every sale ever made.">
            <Sub title="Find and reprint a bill">
              <Steps items={[
                <>Search by <b>invoice no.</b> or <b>customer name</b>.</>,
                <>Open the bill to see all items, the payment method and the cashier.</>,
                <>From here you can print, download or email the receipt again.</>,
              ]} />
            </Sub>
            <Sub title="Edit or reverse a bill (only with permission)">
              <Bullets items={[
                <><B>Edit Bill</B>: fix the customer&apos;s name, phone or email, the note, or the payment method. It does not change items or amounts.</>,
                <><B>Reverse Bill</B>: cancels the whole sale. You must type a reason. The items go back into stock, loyalty points are undone, and the warranties are removed. The bill stays in the list marked <b>Cancelled</b> so there is always a record.</>,
              ]} />
              <Warn>Reversing a bill can&apos;t be undone. If a customer only wants to return part of a bill, talk to your Admin first.</Warn>
            </Sub>
          </Section>

          {/* ---------------- Quotations ---------------- */}
          <Section id="quotations" title="Quotations" icon={FileText}
            intro="Menu: Sales → Quotations. A price offer you give a customer before they decide to buy. It does not change stock.">
            <Sub title="Step by step: create a quotation">
              <Steps items={[
                <>Press <B>New Quotation</B>.</>,
                <>Enter the customer&apos;s name, phone and address. Leave it as <i>Walk-in Customer</i> if you don&apos;t have them.</>,
                <>Press <B>Add Item</B>. Search your products, or type any item name (useful for things you don&apos;t stock). Set quantity, unit price and discount.</>,
                <>Add an <b>overall discount</b> if needed, and any <b>Note / Terms</b>. Set how long the price is <b>valid until</b>.</>,
                <>Save it, then press <B>Print A4</B> or <B>Download</B> to give it to the customer.</>,
              ]} />
            </Sub>
            <Sub title="Keep track of it">
              <p>When the customer replies, open the quotation and press <B>Mark Accepted</B> or <B>Mark Rejected</B>. Use the status filter (Sent, Accepted, Rejected, Expired, Converted) to see where each one stands.</p>
            </Sub>
          </Section>

          {/* ---------------- Warranty ---------------- */}
          <Section id="warranty" title="Warranty" icon={Shield}
            intro="Menu: Sales → Warranty. Warranties are created automatically when you sell a product that has warranty months set. You don't need to add them by hand.">
            <Sub title="Understand the status">
              <Bullets items={[
                <><b className="text-green-700">Active</b>: still under warranty.</>,
                <><b className="text-amber-700">Expiring Soon</b>: 30 days or less left (it shows how many days).</>,
                <><b className="text-red-600">Expired</b>: the warranty period is over.</>,
                <><b>Claimed</b>: the customer has already used this warranty.</>,
              ]} />
            </Sub>
            <Sub title="Step by step: a customer comes back with a warranty problem">
              <Steps items={[
                <>Search by customer name or product. For serial-numbered items, check that the <b>Serial No.</b> matches the item they brought.</>,
                <>Check that the warranty is <b>Active</b>.</>,
                <>Press <B>Claim Warranty</B> and write what was done, for example &quot;Screen replaced under warranty&quot;.</>,
                <>Confirm. The warranty is now marked <b>Claimed</b>.</>,
              ]} />
            </Sub>
          </Section>

          {/* ---------------- Inventory ---------------- */}
          <Section id="inventory" title="Stock & products" icon={Boxes}
            intro="Menu: Inventory. The most important idea to understand first:">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="nexora-card p-4">
                <p className="font-prata text-ink mb-1">Stores Stock</p>
                <p className="text-sm text-zinc-600">The store room or back office. <b>All new stock arrives here first.</b> The POS can&apos;t sell from here.</p>
              </div>
              <div className="nexora-card p-4">
                <p className="font-prata text-ink mb-1">Showroom Stock</p>
                <p className="text-sm text-zinc-600">On display in the shop. <b>The POS only sells from here.</b> Move stock here with a Stock Transfer.</p>
              </div>
            </div>
            <Flow steps={[
              { label: "GRN", note: "Supplier delivers → Stores or Showroom", color: "bg-zinc-400" },
              { label: "Stock Transfer", note: "Stores → Showroom", color: "bg-amber-400" },
              { label: "Sale (POS)", note: "Showroom → Customer", color: "bg-green-500" },
            ]} />

            <Sub title="Products: add a new product">
              <Steps items={[
                <>Go to <Menu path={["Inventory", "Products"]} /> and press the add button.</>,
                <>Fill in the <b>Product Name</b>, <b>Brand</b>, <b>SKU</b> (product code), <b>Main Category</b> and <b>Sub Category</b>.</>,
                <>Set the <b>Selling Price</b>. If you already have some in hand, enter the <b>Initial Stock</b> and its <b>Cost Price</b>.</>,
                <><b>Low Stock Alert</b>: the quantity at which you want to be warned (for example 5).</>,
                <><b>Warranty (months)</b>: for example 12. Use 0 for no warranty.</>,
                <>Tick <B>Track Serial Numbers</B> for items like laptops or phones, where each unit has its own serial number and its own warranty.</>,
                <>Save.</>,
              ]} />
              <Tip>Create <b>Brands</b> and <b>Categories</b> first (in the same Inventory menu) so you can pick them here.</Tip>
            </Sub>

            <Sub title="Products: batches, prices and serial numbers">
              <Bullets items={[
                <>Each time stock arrives at a different cost, it is kept as a separate <b>batch</b>. Open a product to see its <b>Stock Batches</b>: cost, selling price, and quantity left.</>,
                <>A batch can have its own selling price. If you leave it empty, the product&apos;s normal price is used.</>,
                <>For serial-tracked products, you can see and add serial numbers per batch (<B>Add More Serials</B>).</>,
                <>A product can be set <b>Inactive</b> to hide it from the POS without deleting it.</>,
              ]} />
            </Sub>

            <Sub title="GRN: receiving stock from a supplier">
              <Steps items={[
                <>Go to <Menu path={["Inventory", "GRN"]} /> and create a <B>New GRN</B>.</>,
                <>Choose the <b>supplier</b> (optional) and add a note, for example the supplier&apos;s invoice number.</>,
                <>Press <B>Add Item</B>. Choose the product, then enter the <b>cost price</b>, <b>selling price</b> (optional) and <b>quantity</b>. For serial-tracked items, enter each serial number.</>,
                <>Save. The stock is added to <b>Stores Stock</b>, and the cost is added to what the shop owes that supplier.</>,
              ]} />
            </Sub>

            <Sub title="Stock Transfer: moving stock to the showroom">
              <Steps items={[
                <>Go to <Menu path={["Inventory", "Stock Transfer"]} /> and create a <B>New Stock Transfer</B>.</>,
                <>Press <B>Add Item</B>, choose the product (only items with Stores stock are shown), and enter the quantity, or choose the serial numbers.</>,
                <>Save. The items now appear on the POS for sale.</>,
              ]} />
            </Sub>

            <Sub title="Stock Out: stock leaving without a POS sale">
              <p>Use this when items are taken out for a <b>repair job</b>, an <b>off-POS sale</b>, or any <b>other</b> reason (damaged, given to a department, and so on).</p>
              <Steps items={[
                <>Go to <Menu path={["Inventory", "Stock Out"]} /> and create a <B>New Stock Out</B>.</>,
                <><b>Issue From</b>: Showroom or Stores.</>,
                <><b>Issued To</b>: who took it (a customer, technician or department).</>,
                <><b>Reason</b>: Job / Repair (then pick the job), Sale, or Other, with a short detail.</>,
                <>Add the items and save. The stock goes down.</>,
              ]} />
            </Sub>

            <Sub title="Stock Movements: the full history">
              <p>A read-only list of every change to stock: GRN, transfer, stock out, sale, cancelled sale and batch edit. It shows who made each change and when. Use it when a count doesn&apos;t match and you need to find out why.</p>
            </Sub>
          </Section>

          {/* ---------------- Contacts ---------------- */}
          <Section id="contacts" title="Customers & suppliers" icon={Users}>
            <Sub title="Customers (Contacts → Customers)">
              <Bullets items={[
                <>A list of all customers. Search by name or phone.</>,
                <>Add a customer with name and phone (a second phone, email and address are optional). You can also add customers directly from the POS or when creating a job.</>,
                <>Each customer keeps their <b>loyalty points</b> balance.</>,
              ]} />
            </Sub>
            <Sub title="Suppliers (Contacts → Suppliers)">
              <Bullets items={[
                <>Press <B>Add Supplier</B> to save a supplier&apos;s name, phone, email and address.</>,
                <>For each supplier you can see <b>Total Payable</b> (from GRNs), <b>Amount Paid</b>, <b>Balance</b>, and how long it&apos;s been unpaid.</>,
              ]} />
              <p className="font-medium text-ink pt-1">Step by step: pay a supplier</p>
              <Steps items={[
                <>Open the supplier.</>,
                <>Enter the <b>Amount</b>, choose the <b>Method</b> (Cash, Bank Transfer, Cheque, Other), and add a reference (for example a cheque number) and a note.</>,
                <>Save. The balance goes down, and the payment appears in <b>Payment History</b>.</>,
              ]} />
              <p className="text-sm text-zinc-600">
                You can also email a supplier their account statement. The <b>Supplier Payment Report</b> shows all
                payments and everything still owed to every supplier in one place.
              </p>
            </Sub>
          </Section>

          {/* ---------------- Finance ---------------- */}
          <Section id="finance" title="Finance" icon={Wallet}
            intro="Menu: Finance → Overview. For Managers and Admins. Choose a date range at the top to see the numbers for that period.">
            <Sub title="What you can see">
              <Bullets items={[
                <><b>Revenue</b>, <b>COGS</b> (what the sold items cost the shop), <b>Gross Profit</b>, <b>Expenses</b>, <b>Net Profit</b> and <b>Margin</b>.</>,
                <>Totals by <b>payment method</b>, <b>cashier performance</b>, and <b>supplier payables</b> (how much the shop owes).</>,
                <>A day-by-day <b>cash book</b>: opening balance, income, expenses and closing balance.</>,
              ]} />
            </Sub>
            <Sub title="Reviewing shifts">
              <Steps items={[
                <>In the shifts list, filter by cashier, open or closed, or review status.</>,
                <>Open a closed shift to see its float, sales by method, cash paid out, expected cash, counted cash and <b>variance</b>.</>,
                <>Mark it <b>Approved</b> if all is fine, or <b>Flagged</b> if something needs looking into. Add a review note.</>,
              ]} />
              <p className="text-sm text-zinc-600"><b>Admins</b> can also use <B>Force Close (Admin Override)</B> on a shift someone forgot to close, by entering the counted cash and a reason.</p>
            </Sub>
            <Sub title="Step by step: add an expense">
              <Steps items={[
                <>Press <B>Add Expense</B>.</>,
                <>Choose a category (Rent, Utilities, Salaries, Maintenance, Marketing, Other), then enter the amount and a note, for example &quot;July shop rent&quot;.</>,
                <>If the money was taken <b>from a cash drawer</b>, choose <b>which open shift</b> it came from. It is then taken off that shift&apos;s expected cash, so the drawer won&apos;t look short at closing.</>,
                <>Save.</>,
              ]} />
            </Sub>
          </Section>

          {/* ---------------- Salary ---------------- */}
          <Section id="salary" title="Salary" icon={Banknote}
            intro="Menu: Finance → Salary. Admin only (unless access is given). Used to pay staff and keep a record of every payment.">
            <Sub title="One-time setup per employee">
              <p>In the <b>Employee Setup</b> area, press <B>Edit</B> next to each person and set their pay type: <b>Monthly Salary</b>, <b>Commission</b>, or <b>Hybrid</b> (monthly + commission), with the amount and/or %. This only pre-fills the payment form each month.</p>
            </Sub>
            <Sub title="Step by step: pay someone">
              <Steps items={[
                <>Choose the <b>employee</b>. Their type and amount fill in automatically.</>,
                <>For commission: search and link the <b>sales or jobs</b> the commission is for. The commission base totals itself. Then set the <b>Commission %</b>.</>,
                <>Check the <b>Amount to Pay</b>, enter the <b>Period</b> (for example &quot;August 2026&quot;) and a note.</>,
                <>If paid in cash from a drawer, choose which open shift it came from.</>,
                <>Save. The payment is recorded and also added as a <b>Salaries</b> expense automatically.</>,
              ]} />
              <Tip>A sale or job can only be used for one commission payment, so nothing gets paid twice.</Tip>
            </Sub>
          </Section>

          {/* ---------------- Audit ---------------- */}
          <Section id="audit-log" title="Audit log" icon={ShieldCheck}
            intro="Menu: System → Audit Log. Admin only.">
            <Sub title="What it's for">
              <p>Every time someone edits an important record (a bill, a job, a product price and so on), it&apos;s written here: <b>when</b>, <b>who</b>, <b>which record</b>, and <b>what changed</b> (the value before and after). Search by record number or staff name. Nobody can change this list.</p>
            </Sub>
          </Section>

          {/* ---------------- Settings ---------------- */}
          <Section id="settings" title="Settings & team" icon={Settings}
            intro="Menu: System → Settings. Everyone can open it, but only Admins can change things.">
            <Sub title="Shop Info">
              <p>The shop name, phone, email and address. These print on bills, job notes and quotations. Edit and save.</p>
            </Sub>
            <Sub title="Low Stock Alerts">
              <p>Add the email addresses that should get an email when a product drops to its low-stock level after a sale.</p>
            </Sub>
            <Sub title="Team: add a new staff member">
              <Steps items={[
                <>In the <b>Team</b> section, press <B>Add User</B>.</>,
                <>Enter their <b>Full Name</b>, <b>Email</b> and <b>Role</b> (Manager, Cashier, Technician or Staff), and a <b>Password</b> (at least 6 characters) twice.</>,
                <>Save, and give them their email and password. They can change the password later from <B>My Profile</B>.</>,
              ]} />
            </Sub>
            <Sub title="Team: change what someone can see or do">
              <Steps items={[
                <>Press the <b>edit (pencil) icon</b> next to the person.</>,
                <>Change their role, or switch individual permissions on or off, for example hide the Finance page, or allow them to reverse bills.</>,
                <>Save. The next time they load a page, their menu updates.</>,
              ]} />
              <Warn>If someone leaves the shop, remove their account or switch it off, so they can&apos;t sign in any more.</Warn>
            </Sub>
          </Section>

          {/* ---------------- Daily routine ---------------- */}
          <Section id="daily" title="A normal day at the shop" icon={Sun}
            intro="A quick checklist that puts it all together.">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="nexora-card p-4">
                <p className="font-prata text-ink mb-2">Morning</p>
                <Bullets items={[
                  "Sign in.",
                  "Count the drawer cash and open your shift.",
                  "Check the Dashboard's low-stock list.",
                  "Transfer stock to the showroom if needed.",
                ]} />
              </div>
              <div className="nexora-card p-4">
                <p className="font-prata text-ink mb-2">During the day</p>
                <Bullets items={[
                  "Sell with POS / New Sale.",
                  "Take in repairs as new job notes.",
                  "Technicians update job status.",
                  "Bill finished jobs with Find Job to Bill.",
                  "Receive deliveries with a GRN.",
                ]} />
              </div>
              <div className="nexora-card p-4">
                <p className="font-prata text-ink mb-2">Closing</p>
                <Bullets items={[
                  "Record any cash paid out as an expense.",
                  "Count the cash and close your shift.",
                  "Manager reviews and approves the shifts.",
                  "Sign out.",
                ]} />
              </div>
            </div>
          </Section>

          {/* ---------------- FAQ ---------------- */}
          <Section id="faq" title="Questions & problems" icon={HelpCircle}>
            {[
              ["The Checkout button is grey and won't work.", "You probably don't have an open shift. Open one at the top of the POS screen. For a split payment, the amounts must add up exactly (it must say \"Balanced\")."],
              ["A product isn't showing on the POS.", "It either has no Showroom stock (do a Stock Transfer from Stores) or is set to Inactive in Products."],
              ["I can't find a job under \"Find Job to Bill\".", "Only jobs with the status \"Job Done\" appear. Open the job in Jobs and update its status first."],
              ["A page is missing from my menu, or it says \"Access Restricted\".", "Your role doesn't have access to it. Ask your Admin to switch it on for you in Settings → Team."],
              ["I made a mistake on a bill.", "For the customer name, phone, email or payment method, use Edit Bill. For wrong items or amounts, the bill must be reversed and made again. Ask someone with permission."],
              ["The drawer shows a variance at closing.", "Check that every cash payout was recorded as an expense against your shift, and that every sale went through the correct payment method. Add a note explaining the difference."],
              ["I forgot my password.", "Use \"Forgot password?\" on the sign-in screen. A 6-digit code is emailed to you."],
              ["The security check won't finish.", "Refresh the page and try again, check your internet connection, or try another browser."],
            ].map(([q, a]) => (
              <details key={q} className="nexora-card p-4 group">
                <summary className="font-medium text-ink cursor-pointer list-none flex items-center justify-between gap-3">
                  {q}
                  <span className="text-zinc-400 text-lg leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="text-zinc-600 mt-2">{a}</p>
              </details>
            ))}
          </Section>

          <div className="mt-12 pt-6 border-t border-zinc-200 text-center text-xs text-zinc-400 space-y-1">
            <p>Still stuck? Contact your shop Admin.</p>
            <p>© {new Date().getFullYear()} M-Fixpro · Design &amp; Developed by plexCode</p>
          </div>
        </main>
      </div>
    </div>
  );
}
