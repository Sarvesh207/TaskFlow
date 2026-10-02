import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Pick an option in a <SelectMenu> the way a user does: open it by its label, click the option. */
export async function chooseOption(user: UserEvent, label: string, option: string | RegExp) {
  await user.click(screen.getByLabelText(label))
  await user.click(await screen.findByRole('option', { name: option }))
}

/** The option names a <SelectMenu> offers (opens it, reads them, closes it again). */
export async function optionNames(user: UserEvent, label: string): Promise<string[]> {
  await user.click(screen.getByLabelText(label))
  // Each option is named by its label (aria-labelledby), not its avatar initials or hint.
  const names = (await screen.findAllByRole('option')).map((o) => {
    const labelId = o.getAttribute('aria-labelledby')
    return (labelId && document.getElementById(labelId)?.textContent) || (o.textContent ?? '')
  })
  await user.keyboard('{Escape}')
  return names
}
