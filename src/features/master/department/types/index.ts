/** A department master record. */
export interface Department {
  id: number
  branch: string
  departmentName: string
  departmentCode: string
  /** Day of the month the department's cycle starts (1–31). */
  monthStartDate: number
  createdAt: string
}
