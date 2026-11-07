# hackathon_manager — requirements

## Who

Employee with `hackathons` view. Creating, editing, deleting, and generating need edit.

## Screen

`#/admin_dashboard/hackathons`

## Must do

- Create a hackathon as a multiple choice quiz, a coding challenge, or a project.
- Multiple choice questions are generated from source text the same way as a lesson quiz, then edited.
- Coding questions are generated from a prompt and language the same way as a lesson coding exercise.
- A project is a list of tasks.
- Program specific hackathons require a cohort, then one or more programs that belong to that cohort.
- An open hackathon is not tied to a cohort. People outside those programs can take part.
- Save a draft or publish. Publish requires a description, schedule, audience, and at least one question or task.

## Done

- The Hackathons menu opens this screen.
- Empty list explains that no hackathon exists yet.
- View-only employees can open a hackathon and cannot save, generate, or delete.
- A program specific publish is rejected when the programs are not in the selected cohort.
