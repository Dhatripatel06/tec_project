export function renderLoadingSkeleton() {
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md my-space-md animate-pulse">
      <div class="bg-surface-container-low rounded-2xl h-64 w-full p-4 flex flex-col justify-between">
        <div class="h-32 bg-surface-container rounded-xl w-full mb-3"></div>
        <div class="space-y-2">
          <div class="h-4 bg-surface-container rounded w-3/4"></div>
          <div class="h-3 bg-surface-container rounded w-1/2"></div>
        </div>
        <div class="h-8 bg-surface-container rounded-full w-24 self-end mt-4"></div>
      </div>
      <div class="bg-surface-container-low rounded-2xl h-64 w-full p-4 flex flex-col justify-between">
        <div class="h-32 bg-surface-container rounded-xl w-full mb-3"></div>
        <div class="space-y-2">
          <div class="h-4 bg-surface-container rounded w-3/4"></div>
          <div class="h-3 bg-surface-container rounded w-1/2"></div>
        </div>
        <div class="h-8 bg-surface-container rounded-full w-24 self-end mt-4"></div>
      </div>
    </div>
  `;
}
