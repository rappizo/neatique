"use client";

import { useEffect, useRef, useState } from "react";

type ReviewBulkSelectToggleProps = {
  formId: string;
};

function getReviewCheckboxes(formId: string) {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="reviewIds"][form="${formId}"]`
    )
  );
}

export function ReviewBulkSelectToggle({ formId }: ReviewBulkSelectToggleProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [checkedCount, setCheckedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const syncState = () => {
      const reviewCheckboxes = getReviewCheckboxes(formId);
      const nextCheckedCount = reviewCheckboxes.filter((checkbox) => checkbox.checked).length;

      setCheckedCount(nextCheckedCount);
      setTotalCount(reviewCheckboxes.length);

      if (inputRef.current) {
        inputRef.current.checked =
          reviewCheckboxes.length > 0 && nextCheckedCount === reviewCheckboxes.length;
        inputRef.current.indeterminate =
          nextCheckedCount > 0 && nextCheckedCount < reviewCheckboxes.length;
      }
    };

    const reviewCheckboxes = getReviewCheckboxes(formId);
    reviewCheckboxes.forEach((checkbox) => checkbox.addEventListener("change", syncState));
    syncState();

    return () => {
      reviewCheckboxes.forEach((checkbox) => checkbox.removeEventListener("change", syncState));
    };
  }, [formId]);

  return (
    <label className="admin-table__checkbox-label admin-table__checkbox-label--header">
      <input
        ref={inputRef}
        type="checkbox"
        aria-label={checkedCount === totalCount && totalCount > 0 ? "Clear all reviews" : "Select all reviews"}
        onChange={(event) => {
          const nextChecked = event.currentTarget.checked;
          const reviewCheckboxes = getReviewCheckboxes(formId);

          reviewCheckboxes.forEach((checkbox) => {
            checkbox.checked = nextChecked;
          });

          setCheckedCount(nextChecked ? reviewCheckboxes.length : 0);
          setTotalCount(reviewCheckboxes.length);

          if (inputRef.current) {
            inputRef.current.indeterminate = false;
          }
        }}
      />
      <span>{checkedCount === totalCount && totalCount > 0 ? "Clear" : "All"}</span>
    </label>
  );
}
