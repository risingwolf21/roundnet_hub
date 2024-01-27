# Roundnet Karlsruhe App
[![Production](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/firebase_deployment.yml/badge.svg?branch=production)](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/firebase_deployment.yml)
[![Building](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/react_build_deploy_staging.yml/badge.svg?branch=master)](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/react_build_deploy_staging.yml)
[![Database Backup](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/supabase_production_backup.yml/badge.svg?branch=master)](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/supabase_production_backup.yml)

## Hosting

[https://roundnet-karlsruhe.web.app/](https://roundnet-karlsruhe.web.app/)

[https://staging-roundnet-karlsruhe.web.app/](https://staging-roundnet-karlsruhe.web.app/)

## Release

To create a release you need to push a commit to the `production` branch. <br/>
To prevent any unwanted releases, the pipeline only gets triggered when you merge via a Pull-Request.
To create one, follow the link bellow:

[Create new release](https://github.com/risingwolf21/roundnet_karlsruhe_app/compare/production...master)

# Development

## Supabase

<details open>
  <summary>Generate Typescript Types</summary>

<br>

 | :warning: **Saving format**: This file will be generated as a `UTF-16 LE`. Make sure to save it as a `UTF-8` file! |
 | --- |

  ### Staging
```
npx supabase gen types typescript --project-id xibmjvkjkdxdbmreicps > src/types/supabase.ts
```

### Production
```
npx supabase gen types typescript --project-id vsuhzabcrnmrljzecxee > src/types/supabase.ts
```
</details>

<details>
  <summary>Database dump</summary>

  ### Downloading database dump
```
npx supabase db dump --db-url postgres://postgres."$SUPABASE_PRODUCTION_ID":"$SUPABASE_PRODUCTION_DB_PASSWORD"@aws-0-eu-central-1.pooler.supabase.com:6543/postgres -f supabase/backup/"$NOW"_production_data.sql --use-copy --data-only
```
```
npx supabase db dump --db-url postgres://postgres."$SUPABASE_PRODUCTION_ID":"$SUPABASE_PRODUCTION_DB_PASSWORD"@aws-0-eu-central-1.pooler.supabase.com:6543/postgres -f supabase/backup/"$NOW"_production_schema.sql
```
```
npx supabase db dump --db-url postgres://postgres."$SUPABASE_PRODUCTION_ID":"$SUPABASE_PRODUCTION_DB_PASSWORD"@aws-0-eu-central-1.pooler.supabase.com:6543/postgres -f supabase/backup/"$NOW"_production_roles.sql --role-only
```

### Applying database dump
```
psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -d postgres -U postgres.PROJECT_REF --single-transaction --variable ON_ERROR_STOP=1 --file backup/"$NOW"_production_roles.sql --command 'SET session_replication_role = replica' --file backup/"$NOW"_production_data.sql
```
</details>

## Notifications

| Notification-Tag | Beschreibung                                            |
|------------------|---------------------------------------------------------|
| userRegistration | Once a user gets registered and added to the user table |

## Permissions

Actions: `use, edit, delete, view`

| Permission-Name | Beschreibung                                              | admin | finance | procure | trainer | user |
|-----------------|-----------------------------------------------------------|-------|---------|---------|---------|------|
| use;drink       | User can buy a drink                                      | ✅     | ✅       | ✅       | ✅       | ✅    |
| edit;drink      | User can edit drinks                                      | ✅     | ❌       | ✅       | ❌       | ❌    |
| delete;drink    | User can delete a drink (only deactivates it in database) | ✅     | ❌       | ✅       | ❌       | ❌    |
| view;drink      | User can see the current drinks and drink list            | ✅     | ✅       | ✅       | ✅       | ✅    |
||||||||
| use;training    | User can attend/decline trainings                         | ✅     | ✅       | ✅       | ✅       | ✅    |
| edit;training   | User can create new training events                       | ✅     | ❌       | ❌       | ✅       | ❌    |
| delete;training | User can delete events                                    | ✅     | ❌       | ❌       | ✅       | ❌    |
| view;training   | User can view training events list                        | ✅     | ✅       | ✅       | ✅       | ✅    |
||||||||
| edit;groups     | Change users for group or edit group information          | ✅     | ❌       | ❌       | ✅       | ❌    |
| delete;groups   | Delete a group (could possibile delete events)            | ✅     | ❌       | ❌       | ❌       | ❌    |
| view;groups     | User can view the groups he is assigned to                | ✅     | ✅       | ✅       | ✅       | ✅    |
||||||||
| edit;payments   | User can accept payments                                  | ✅     | ✅       | ❌       | ❌       | ❌    |
||||||||
| use;user        | User can edit his own informations                        | ✅     | ✅       | ✅       | ✅       | ✅    |
| edit;user       | Edit user information/verification state/permissions      | ✅     | ❌       | ❌       | ❌       | ❌    |
| delete;user     | User can edit his own informations                        | ✅     | ❌       | ❌       | ❌       | ❌    |
| view;user       | User can view his own informations                        | ✅     | ✅       | ✅       | ✅       | ✅    |
||||||||
| view;keyFinder  | User can view key finder                                  | ✅     | ✅       | ✅       | ✅       | ✅    |
| edit;keyFinder  | User can edit keys                                        | ✅     | ❌       | ❌       | ❌       | ❌    |
| delete;keyFinder| User can delete keys                                      | ✅     | ❌       | ❌       | ❌       | ❌    |

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the staging mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

## Getting started

[https://nodejs.org/en/download](https://nodejs.org/en/download)

[https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)

1. `cd roundnet_karlsruhe_app`
2. `yarn install`
3. `yarn start`
4. Open [`http://localhost:3000`](http://localhost:3000)


[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Mui]: https://img.shields.io/badge/Material%20UI-007FFF?style=for-the-badge&logo=mui&logoColor=white
[Mui-url]: https://mui.com/
[issues-shield]: https://img.shields.io/github/issues/othneildrew/Best-README-Template.svg?style=for-the-badge
[issues-url]: https://github.com/risingwolf21/roundnet_karlsruhe_app/issues

