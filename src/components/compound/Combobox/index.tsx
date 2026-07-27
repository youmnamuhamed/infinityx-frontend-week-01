// src/components/compound/Combobox/index.tsx
import { ComboboxRoot } from "./Combobox";
import { ComboboxInput } from "./Input";
import { ComboboxList } from "./List";
import { ComboboxItem } from "./Item";
import { ComboboxGroup } from "./Group";

/**
 * Headless compound Combobox — filters nothing itself. You own the
 * item list and filter it by the current input value; Combobox handles
 * open/close, active-option tracking, and ARIA wiring.
 *
 * Usage:
 *   const [query, setQuery] = useState("");
 *   const matches = allUsers.filter(u =>
 *     u.name.toLowerCase().includes(query.toLowerCase())
 *   );
 *
 *   <Combobox onInputValueChange={setQuery} onValueChange={(id) => ...}>
 *     <Combobox.Input placeholder="Search users..." />
 *     <Combobox.List emptyState="No users found">
 *       {matches.map((u) => (
 *         <Combobox.Item key={u.id} id={u.id} label={u.name}>
 *           {u.name} — {u.role}
 *         </Combobox.Item>
 *       ))}
 *     </Combobox.List>
 *   </Combobox>
 */
export const Combobox = Object.assign(ComboboxRoot, {
  Input: ComboboxInput,
  List: ComboboxList,
  Item: ComboboxItem,
  Group: ComboboxGroup,
});

export default Combobox;
