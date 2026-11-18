// next/navigation, standing still on the home route.
const router = { push() {}, replace() {}, prefetch() {}, back() {}, forward() {}, refresh() {} };
export const usePathname = () => "/";
export const useRouter = () => router;
export const useParams = () => ({});
export const useSearchParams = () => new URLSearchParams();
export const redirect = () => {};
export const notFound = () => {};
