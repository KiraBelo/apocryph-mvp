# Anti-pattern: alert() and window.confirm()

## Why banned

- `alert()` blocks the UI thread and cannot be styled to match the app theme
- `window.confirm()` is similarly blocking and unstyled
- Both break the user experience on mobile devices
- Neither can be programmatically dismissed or tested

## Do this instead

Use `addToast()` from `ToastProvider` for feedback, and `<ConfirmDialog>` for confirmations.

### In page components (have context access)

```tsx
const { addToast } = useToast()

// Success
addToast(t('game.reportSent') as string, 'success')

// Error
addToast(t('errors.generic') as string, 'error')
```

### In hooks (no context access)

Pass `addToast` as a parameter:

```tsx
function useGameChat({ addToast, ...rest }: { addToast: AddToastFn }) {
  // use addToast directly
  addToast(t('errors.networkError') as string, 'error')
}
```

### For dangerous actions

Use `<ConfirmDialog>` instead of `window.confirm()`:

```tsx
<ConfirmDialog
  open={showConfirm}
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
  message={t('detail.confirmDelete') as string}
/>
```

## Discovered during

Task #2 (hooks), Task #3 (AdminModeration) — replaced all alert() calls across the codebase.
