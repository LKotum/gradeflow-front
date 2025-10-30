export const formatFullName = (
  lastName?: string | null,
  firstName?: string | null,
  middleName?: string | null
): string => {
  const parts = [lastName, firstName, middleName].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  return parts.join(" ");
};

export const formatNameWithInitials = (
  lastName?: string | null,
  firstName?: string | null,
  middleName?: string | null
): string => {
  const base = lastName ? lastName.trim() : "";
  const initials = [firstName, middleName]
    .filter((part) => part && part.trim())
    .map((part) => `${part!.trim()[0]}.`)
    .join(" ");
  return [base, initials].filter(Boolean).join(" ");
};
