// Realistic seed dataset for Boierpata. This is the single source of truth for
// initial catalog content used by the Prisma seed script. Book covers are
// rendered procedurally (BookCover), so coverUrl is left blank for books.

import type {
  Author, Banner, BlogPost, Book, Category, CmsPage, Coupon, Publisher, Review, Seller,
} from "../types";

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAhead = (h: number) => new Date(now + h * 3600000).toISOString();
const pic = (seed: string, w = 800, h = 500) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const seedSellers: Seller[] = [
  { id: "s1", slug: "boierpata-store", name: "Boierpata Store", logoUrl: pic("seller1", 100, 100), rating: 4.8, since: "2018" },
  { id: "s2", slug: "prothoma-prokashan", name: "Prothoma Prokashan", logoUrl: pic("seller2", 100, 100), rating: 4.7, since: "2009" },
  { id: "s3", slug: "knowledge-hub", name: "Knowledge Hub", logoUrl: pic("seller3", 100, 100), rating: 4.6, since: "2015" },
];

export const seedPublishers: Publisher[] = [
  { id: "p1", slug: "anyaprokash", name: "Anyaprokash", bookCount: 6 },
  { id: "p2", slug: "prothoma-prokashan", name: "Prothoma Prokashan", bookCount: 5 },
  { id: "p3", slug: "penguin-books", name: "Penguin Books", bookCount: 5 },
  { id: "p4", slug: "harpercollins", name: "HarperCollins", bookCount: 4 },
  { id: "p5", slug: "sheba-prokashani", name: "Sheba Prokashani", bookCount: 4 },
];

export const seedAuthors: Author[] = [
  { id: "a1", slug: "humayun-ahmed", name: "Humayun Ahmed", bio: "One of the most celebrated Bengali novelists and dramatists, creator of the iconic characters Himu and Misir Ali.", photoUrl: pic("author1", 300, 300), bookCount: 5 },
  { id: "a2", slug: "muhammed-zafar-iqbal", name: "Muhammed Zafar Iqbal", bio: "Bangladeshi author, physicist and academic, known for science fiction and children's literature.", photoUrl: pic("author2", 300, 300), bookCount: 3 },
  { id: "a3", slug: "james-clear", name: "James Clear", bio: "Author and speaker focused on habits, decision-making, and continuous improvement.", photoUrl: pic("author3", 300, 300), bookCount: 1 },
  { id: "a4", slug: "yuval-noah-harari", name: "Yuval Noah Harari", bio: "Historian and philosopher, author of global bestsellers on the history and future of humankind.", photoUrl: pic("author4", 300, 300), bookCount: 2 },
  { id: "a5", slug: "robert-c-martin", name: "Robert C. Martin", bio: "Software engineer and author, widely known as 'Uncle Bob' for his work on software craftsmanship.", photoUrl: pic("author5", 300, 300), bookCount: 1 },
  { id: "a6", slug: "j-k-rowling", name: "J. K. Rowling", bio: "British author, best known for the Harry Potter fantasy series.", photoUrl: pic("author6", 300, 300), bookCount: 2 },
  { id: "a7", slug: "sarat-chandra", name: "Sarat Chandra Chattopadhyay", bio: "Legendary Bengali novelist and short story writer of the early twentieth century.", photoUrl: pic("author7", 300, 300), bookCount: 2 },
  { id: "a8", slug: "paulo-coelho", name: "Paulo Coelho", bio: "Brazilian lyricist and novelist, author of The Alchemist.", photoUrl: pic("author8", 300, 300), bookCount: 1 },
];

export const seedCategories: Category[] = [
  { id: "c1", slug: "fiction", name: "Fiction", parentId: null, icon: "BookOpen" },
  { id: "c2", slug: "non-fiction", name: "Non-Fiction", parentId: null, icon: "Newspaper" },
  { id: "c3", slug: "academic", name: "Academic & Exam", parentId: null, icon: "GraduationCap" },
  { id: "c4", slug: "children", name: "Children & Young Adult", parentId: null, icon: "Baby" },
  { id: "c5", slug: "religion", name: "Religion & Spirituality", parentId: null, icon: "Moon" },
  { id: "c6", slug: "science-tech", name: "Science & Technology", parentId: null, icon: "FlaskConical" },
  // subcategories
  { id: "c1a", slug: "novels", name: "Novels", parentId: "c1" },
  { id: "c1b", slug: "short-stories", name: "Short Stories", parentId: "c1" },
  { id: "c1c", slug: "classics", name: "Classics", parentId: "c1" },
  { id: "c2a", slug: "self-help", name: "Self-Help", parentId: "c2" },
  { id: "c2b", slug: "history", name: "History", parentId: "c2" },
  { id: "c2c", slug: "biography", name: "Biography", parentId: "c2" },
  { id: "c3a", slug: "bcs-preparation", name: "BCS Preparation", parentId: "c3" },
  { id: "c3b", slug: "english-language", name: "English Language", parentId: "c3" },
  { id: "c6a", slug: "programming", name: "Programming", parentId: "c6" },
  { id: "c6b", slug: "popular-science", name: "Popular Science", parentId: "c6" },
];

interface RawBook {
  slug: string; title: string; authorIds: string[]; publisherId: string; categoryIds: string[];
  price: number; oldPrice: number; stock: number; language: Book["language"]; binding: Book["binding"];
  pages: number; ratingAvg: number; ratingCount: number; sellerId: string;
  flags?: Partial<Pick<Book, "isBestseller" | "isNewArrival" | "isEditorsChoice" | "isAwardWinner">>;
  flash?: { price: number; hours: number };
  translator?: string; created: number; desc: string;
}

const raw: RawBook[] = [
  { slug: "himu", title: "Himu", authorIds: ["a1"], publisherId: "p1", categoryIds: ["c1", "c1a"], price: 280, oldPrice: 350, stock: 40, language: "Bangla", binding: "Paperback", pages: 144, ratingAvg: 4.7, ratingCount: 1240, sellerId: "s1", flags: { isBestseller: true }, created: 400, desc: "The barefoot wanderer Himu roams Dhaka in his yellow panjabi, defying logic and delighting readers with his eccentric wisdom." },
  { slug: "misir-ali-omnibus", title: "Misir Ali Omnibus", authorIds: ["a1"], publisherId: "p1", categoryIds: ["c1", "c1a"], price: 620, oldPrice: 800, stock: 22, language: "Bangla", binding: "Hardcover", pages: 512, ratingAvg: 4.8, ratingCount: 980, sellerId: "s1", flags: { isBestseller: true, isEditorsChoice: true }, created: 380, desc: "A collection of mysteries solved by the rationalist psychologist Misir Ali, where nothing is quite what it seems." },
  { slug: "deyal", title: "Deyal", authorIds: ["a1"], publisherId: "p1", categoryIds: ["c1", "c1a"], price: 340, oldPrice: 420, stock: 0, language: "Bangla", binding: "Hardcover", pages: 232, ratingAvg: 4.5, ratingCount: 410, sellerId: "s1", created: 300, desc: "A historical novel set against the turbulent political backdrop of post-liberation Bangladesh." },
  { slug: "shonkhonil-karagar", title: "Shonkhonil Karagar", authorIds: ["a1"], publisherId: "p1", categoryIds: ["c1", "c1c"], price: 250, oldPrice: 300, stock: 15, language: "Bangla", binding: "Paperback", pages: 128, ratingAvg: 4.6, ratingCount: 520, sellerId: "s2", created: 500, desc: "A poignant family drama exploring the ties that bind and the walls that divide." },
  { slug: "nondito-noroke", title: "Nondito Noroke", authorIds: ["a1"], publisherId: "p2", categoryIds: ["c1", "c1a"], price: 260, oldPrice: 320, stock: 30, language: "Bangla", binding: "Paperback", pages: 136, ratingAvg: 4.7, ratingCount: 690, sellerId: "s2", flags: { isAwardWinner: true }, created: 520, desc: "Humayun Ahmed's landmark debut, a searing portrait of an ordinary family's joys and tragedies." },
  { slug: "amar-ache-jol", title: "Amar Ache Jol", authorIds: ["a2"], publisherId: "p2", categoryIds: ["c1", "c1a"], price: 300, oldPrice: 360, stock: 25, language: "Bangla", binding: "Paperback", pages: 180, ratingAvg: 4.4, ratingCount: 320, sellerId: "s1", created: 200, desc: "A moving tale of love, memory, and the quiet currents that shape our lives." },
  { slug: "dipu-number-two", title: "Dipu Number Two", authorIds: ["a2"], publisherId: "p2", categoryIds: ["c4"], price: 220, oldPrice: 280, stock: 60, language: "Bangla", binding: "Paperback", pages: 160, ratingAvg: 4.8, ratingCount: 870, sellerId: "s1", flags: { isBestseller: true }, created: 260, desc: "A beloved children's adventure about friendship, courage, and a boy who moves to a new town." },
  { slug: "ami-topu", title: "Ami Topu", authorIds: ["a2"], publisherId: "p2", categoryIds: ["c4"], price: 210, oldPrice: 260, stock: 45, language: "Bangla", binding: "Paperback", pages: 152, ratingAvg: 4.6, ratingCount: 430, sellerId: "s3", flags: { isNewArrival: true }, created: 40, desc: "Through a child's honest eyes, everyday life becomes an extraordinary adventure." },
  { slug: "atomic-habits", title: "Atomic Habits", authorIds: ["a3"], publisherId: "p3", categoryIds: ["c2", "c2a"], price: 540, oldPrice: 700, stock: 80, language: "English", binding: "Paperback", pages: 320, ratingAvg: 4.9, ratingCount: 5400, sellerId: "s3", flags: { isBestseller: true, isEditorsChoice: true }, flash: { price: 450, hours: 36 }, created: 150, desc: "An easy and proven way to build good habits and break bad ones, with tiny changes that deliver remarkable results." },
  { slug: "sapiens", title: "Sapiens: A Brief History of Humankind", authorIds: ["a4"], publisherId: "p4", categoryIds: ["c2", "c2b"], price: 690, oldPrice: 900, stock: 55, language: "English", binding: "Paperback", pages: 464, ratingAvg: 4.8, ratingCount: 4200, sellerId: "s3", flags: { isBestseller: true }, created: 220, desc: "A sweeping narrative of how Homo sapiens came to dominate the planet, from the cognitive revolution to today." },
  { slug: "homo-deus", title: "Homo Deus: A Brief History of Tomorrow", authorIds: ["a4"], publisherId: "p4", categoryIds: ["c2", "c2b"], price: 650, oldPrice: 820, stock: 33, language: "English", binding: "Paperback", pages: 448, ratingAvg: 4.6, ratingCount: 2100, sellerId: "s3", flags: { isNewArrival: true }, created: 60, desc: "Harari turns to the future, exploring the dreams and nightmares that will shape the twenty-first century." },
  { slug: "clean-code", title: "Clean Code", authorIds: ["a5"], publisherId: "p4", categoryIds: ["c6", "c6a", "c3"], price: 780, oldPrice: 950, stock: 40, language: "English", binding: "Paperback", pages: 464, ratingAvg: 4.7, ratingCount: 3300, sellerId: "s3", flags: { isEditorsChoice: true }, flash: { price: 650, hours: 12 }, created: 180, desc: "A handbook of agile software craftsmanship that has become essential reading for professional developers." },
  { slug: "harry-potter-1", title: "Harry Potter and the Philosopher's Stone", authorIds: ["a6"], publisherId: "p3", categoryIds: ["c1", "c4"], price: 620, oldPrice: 780, stock: 70, language: "English", binding: "Hardcover", pages: 332, ratingAvg: 4.9, ratingCount: 8900, sellerId: "s1", flags: { isBestseller: true }, created: 320, desc: "The boy who lived discovers he is a wizard and begins his first year at Hogwarts School of Witchcraft and Wizardry." },
  { slug: "harry-potter-2", title: "Harry Potter and the Chamber of Secrets", authorIds: ["a6"], publisherId: "p3", categoryIds: ["c1", "c4"], price: 640, oldPrice: 800, stock: 50, language: "English", binding: "Hardcover", pages: 341, ratingAvg: 4.8, ratingCount: 7200, sellerId: "s1", created: 310, desc: "A hidden chamber opens at Hogwarts, and Harry must uncover the secret before it's too late." },
  { slug: "the-alchemist", title: "The Alchemist", authorIds: ["a8"], publisherId: "p4", categoryIds: ["c1", "c2a"], price: 380, oldPrice: 480, stock: 90, language: "English", binding: "Paperback", pages: 208, ratingAvg: 4.7, ratingCount: 6100, sellerId: "s2", flags: { isBestseller: true }, created: 340, desc: "A shepherd boy's journey to the Egyptian pyramids in search of treasure becomes a fable about following your dreams." },
  { slug: "devdas", title: "Devdas", authorIds: ["a7"], publisherId: "p5", categoryIds: ["c1", "c1c"], price: 240, oldPrice: 300, stock: 35, language: "Bangla", binding: "Paperback", pages: 160, ratingAvg: 4.5, ratingCount: 560, sellerId: "s2", flags: { isEditorsChoice: true }, created: 600, desc: "The timeless tragedy of love and self-destruction that has captivated readers for over a century." },
  { slug: "srikanta", title: "Srikanta", authorIds: ["a7"], publisherId: "p5", categoryIds: ["c1", "c1c"], price: 320, oldPrice: 400, stock: 20, language: "Bangla", binding: "Hardcover", pages: 288, ratingAvg: 4.6, ratingCount: 380, sellerId: "s2", created: 610, desc: "A semi-autobiographical wander through the joys, loves and disappointments of a restless soul." },
  { slug: "bcs-preliminary-digest", title: "BCS Preliminary Digest", authorIds: ["a2"], publisherId: "p5", categoryIds: ["c3", "c3a"], price: 450, oldPrice: 560, stock: 120, language: "Bangla", binding: "Paperback", pages: 720, ratingAvg: 4.4, ratingCount: 1500, sellerId: "s3", flags: { isBestseller: true }, created: 90, desc: "A comprehensive digest covering every subject of the BCS preliminary examination with practice MCQs." },
  { slug: "english-for-competitive", title: "English for Competitive Exams", authorIds: ["a5"], publisherId: "p5", categoryIds: ["c3", "c3b"], price: 360, oldPrice: 450, stock: 100, language: "English", binding: "Paperback", pages: 480, ratingAvg: 4.3, ratingCount: 640, sellerId: "s3", flags: { isNewArrival: true }, created: 30, desc: "Master grammar, vocabulary and comprehension for job and admission tests with structured lessons." },
  { slug: "a-brief-history-of-time", title: "A Brief History of Time", authorIds: ["a4"], publisherId: "p3", categoryIds: ["c6", "c6b"], price: 520, oldPrice: 640, stock: 28, language: "English", binding: "Paperback", pages: 256, ratingAvg: 4.6, ratingCount: 2900, sellerId: "s3", created: 260, desc: "An accessible exploration of black holes, the big bang, and the nature of time itself." },
  { slug: "the-selfish-gene", title: "The Selfish Gene", authorIds: ["a3"], publisherId: "p3", categoryIds: ["c6", "c6b"], price: 560, oldPrice: 700, stock: 18, language: "English", binding: "Paperback", pages: 360, ratingAvg: 4.5, ratingCount: 1700, sellerId: "s3", created: 280, desc: "A landmark work of popular science that reshaped how we think about evolution and genes." },
  { slug: "the-pragmatic-programmer", title: "The Pragmatic Programmer", authorIds: ["a5"], publisherId: "p4", categoryIds: ["c6", "c6a"], price: 820, oldPrice: 990, stock: 24, language: "English", binding: "Hardcover", pages: 352, ratingAvg: 4.8, ratingCount: 2600, sellerId: "s3", flags: { isEditorsChoice: true }, created: 170, desc: "Timeless lessons on writing better software and growing as a pragmatic, thoughtful developer." },
  { slug: "quran-translation", title: "The Holy Quran — Bangla Translation", authorIds: ["a7"], publisherId: "p5", categoryIds: ["c5"], price: 400, oldPrice: 500, stock: 65, language: "Arabic", binding: "Hardcover", pages: 604, ratingAvg: 4.9, ratingCount: 3100, sellerId: "s1", flags: { isBestseller: true }, created: 210, desc: "A clear Bangla translation with the original Arabic text, presented in an elegant hardcover edition." },
  { slug: "gitanjali", title: "Gitanjali", authorIds: ["a7"], publisherId: "p2", categoryIds: ["c1", "c1c"], price: 300, oldPrice: 380, stock: 12, language: "Bangla", binding: "Hardcover", pages: 160, ratingAvg: 4.7, ratingCount: 720, sellerId: "s2", flags: { isAwardWinner: true, isEditorsChoice: true }, created: 260, desc: "A luminous collection of devotional poems that won the Nobel Prize in Literature." },
];

export const seedBooks: Book[] = raw.map((r, i) => ({
  id: `b${i + 1}`,
  slug: r.slug,
  title: r.title,
  authorIds: r.authorIds,
  translator: r.translator,
  publisherId: r.publisherId,
  categoryIds: r.categoryIds,
  isbn: `978-984-${String(10000 + i).slice(0, 5)}-${(i % 9) + 1}`,
  edition: `${(i % 4) + 1}${["st", "nd", "rd", "th"][Math.min(i % 4, 3)]} Edition, ${2018 + (i % 7)}`,
  pages: r.pages,
  language: r.language,
  binding: r.binding,
  weightGrams: 200 + r.pages,
  price: r.price,
  oldPrice: r.oldPrice,
  stock: r.stock,
  coverUrl: "",
  images: [],
  description: r.desc,
  ratingAvg: r.ratingAvg,
  ratingCount: r.ratingCount,
  sellerId: r.sellerId,
  isBestseller: !!r.flags?.isBestseller,
  isNewArrival: !!r.flags?.isNewArrival,
  isEditorsChoice: !!r.flags?.isEditorsChoice,
  isAwardWinner: !!r.flags?.isAwardWinner,
  flashSale: r.flash ? { price: r.flash.price, endsAt: hoursAhead(r.flash.hours) } : undefined,
  createdAt: daysAgo(r.created),
}));

export const seedReviews: Review[] = [
  { id: "r1", bookId: "b1", userId: "seed", userName: "Rafiq H.", rating: 5, title: "Timeless", body: "Himu never gets old. A must-read for every Bengali reader.", createdAt: daysAgo(20), approved: true, helpful: 34 },
  { id: "r2", bookId: "b1", userId: "seed", userName: "Nusrat J.", rating: 4, title: "Lovely", body: "Beautiful prose and unforgettable characters.", createdAt: daysAgo(12), approved: true, helpful: 11 },
  { id: "r3", bookId: "b9", userId: "seed", userName: "Tanvir A.", rating: 5, title: "Life-changing", body: "Practical and actionable. Changed how I approach my daily routines.", createdAt: daysAgo(8), approved: true, helpful: 52 },
  { id: "r4", bookId: "b10", userId: "seed", userName: "Sadia R.", rating: 5, title: "Fascinating", body: "A brilliant overview of human history. Couldn't put it down.", createdAt: daysAgo(30), approved: true, helpful: 40 },
  { id: "r5", bookId: "b12", userId: "seed", userName: "Imran K.", rating: 5, title: "Essential", body: "Every developer should read this at least once.", createdAt: daysAgo(15), approved: true, helpful: 28 },
];

export const seedCoupons: Coupon[] = [
  { code: "BOOK10", type: "percent", value: 10, minSpend: 300, active: true, expiresAt: hoursAhead(24 * 90) },
  { code: "FLAT100", type: "flat", value: 100, minSpend: 800, active: true, expiresAt: hoursAhead(24 * 60) },
  { code: "EIDSALE", type: "percent", value: 20, minSpend: 1000, active: true, expiresAt: hoursAhead(24 * 30) },
];

export const seedBanners: Banner[] = [
  { id: "bn1", sortOrder: 0, title: "Discover Your Next Great Read", subtitle: "Thousands of titles across every genre, delivered nationwide.", ctaLabel: "Shop All Books", ctaHref: "/books", imageUrl: pic("banner1", 1200, 600), bg: "linear-gradient(135deg,#1f6f52,#134034)" },
  { id: "bn2", sortOrder: 1, title: "Flash Sale — Up to 30% Off", subtitle: "Grab bestsellers at unbeatable prices while stocks last.", ctaLabel: "See Deals", ctaHref: "/books?flag=flash", imageUrl: pic("banner2", 1200, 600), bg: "linear-gradient(135deg,#d98324,#8a4b2f)" },
  { id: "bn3", sortOrder: 2, title: "Classics That Never Fade", subtitle: "Rediscover timeless literature from legendary authors.", ctaLabel: "Explore Classics", ctaHref: "/category/classics", imageUrl: pic("banner3", 1200, 600), bg: "linear-gradient(135deg,#2c4a6e,#182d45)" },
];

export const seedBlog: BlogPost[] = [
  { id: "bl1", slug: "10-bengali-novels-to-read", title: "10 Bengali Novels Everyone Should Read Once", excerpt: "From Humayun Ahmed to Sarat Chandra, here are the timeless novels that define Bengali literature.", body: "Bengali literature is rich with stories that have shaped generations of readers.\n\nFrom the wandering Himu to the tragic Devdas, these novels capture the soul of a culture.\n\nWhether you are a lifelong reader or just beginning your journey, this list is the perfect place to start.", coverUrl: pic("blog1"), author: "Editorial Team", category: "Reading Lists", createdAt: daysAgo(5) },
  { id: "bl2", slug: "building-a-reading-habit", title: "How to Build a Lasting Reading Habit", excerpt: "Small, consistent changes can turn reading from a chore into a daily joy.", body: "The secret to reading more is not willpower — it's system design.\n\nStart with just five pages a day, keep a book visible, and pair reading with an existing routine.\n\nOver time, these tiny habits compound into a rich reading life.", coverUrl: pic("blog2"), author: "Nusrat Jahan", category: "Tips", createdAt: daysAgo(12) },
  { id: "bl3", slug: "bcs-preparation-guide", title: "A Smart Guide to BCS Exam Preparation", excerpt: "Structure your study, pick the right books, and practice with purpose.", body: "Preparing for the BCS examination can feel overwhelming.\n\nBreak your syllabus into weekly goals, use a trusted digest, and take regular mock tests.\n\nConsistency and the right resources make all the difference.", coverUrl: pic("blog3"), author: "Editorial Team", category: "Academic", createdAt: daysAgo(20) },
];

export const seedCmsPages: CmsPage[] = [
  { slug: "about", title: "About Boierpata", body: "Boierpata is Bangladesh's book universe — a place where readers discover, explore, and celebrate books of every kind.\n\nWe partner with publishers and sellers across the country to bring you an unmatched catalogue at fair prices, delivered to your doorstep.\n\nOur mission is simple: to make great books accessible to everyone." },
  { slug: "contact", title: "Contact Us", body: "We'd love to hear from you.\n\nEmail: support@boierpata.com\nPhone: +880 1700-000000\nAddress: 123 Book Street, Dhaka 1205, Bangladesh\n\nOur support team is available from 9am to 9pm, seven days a week." },
  { slug: "shipping-returns", title: "Shipping & Returns", body: "We deliver nationwide within 2–5 business days.\n\nShipping inside Dhaka is ৳60, and ৳120 outside Dhaka. Orders over ৳1000 ship free.\n\nBooks can be returned within 7 days of delivery if they arrive damaged or incorrect." },
  { slug: "privacy", title: "Privacy Policy", body: "Your privacy matters to us.\n\nWe collect only the information needed to process your orders and improve your experience.\n\nWe never sell your data to third parties." },
];

export const seedSettings = {
  siteName: "Boierpata",
  currency: "BDT",
  freeShippingThreshold: 1000,
  supportEmail: "support@boierpata.com",
};
