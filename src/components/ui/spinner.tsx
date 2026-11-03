import { cn } from "@/lib/utils"
import { LoaderIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const { t } = useTranslation()
  return (
    <LoaderIcon role="status" aria-label={t('common.loading')} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
