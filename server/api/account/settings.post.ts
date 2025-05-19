export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body: { isEVMModeActive?: boolean } = await readBody(event)
  await setUserSession(event, {
    user: {
      ...session.user,
      isEVMModeActive: body.isEVMModeActive ?? session.user.isEVMModeActive ?? false,
    },
  })
})
