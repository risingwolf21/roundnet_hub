<br/>
<p align="center">
  <a>
    <img src="src/images/Karlsruher_Kojoten_Logo.svg" alt="Logo" width="200" height="200">
  </a>

  <h2 align="center">Roundnet Karlsruhe Web App</h2>

  <p align="center">
    Web Application to admister events and drinks for the Roundnet Karlsruhe Community
    <br/>
    <br/>
    <br/>
    <p align="center">
      <a href="https://roundnet-karlsruhe.web.app">View Production</a>
      .
      <a href="https://staging-roundnet-karlsruhe.web.app">View Staging</a>
      .
      <a href="https://github.com/risingwolf21/roundnet_karlsruhe_app/issues">Report Bug</a>
    </p>
  </p>
</p>

[![Production](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/firebase_deployment.yml/badge.svg?branch=production)](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/firebase_deployment.yml) [![Staging](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/react_build_deploy_staging.yml/badge.svg)](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/react_build_deploy_staging.yml) [![Database Backup](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/supabase_production_backup.yml/badge.svg?branch=master)](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/supabase_production_backup.yml) [![Building](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/react_build_deploy_staging.yml/badge.svg)](https://github.com/risingwolf21/roundnet_karlsruhe_app/actions/workflows/react_build_deploy_staging.yml)

## Hosting
<!---
> [!NOTE]  
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]  
> Crucial information necessary for users to succeed.

> [!WARNING]  
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.
--->
[https://roundnet-karlsruhe.web.app/](https://roundnet-karlsruhe.web.app/)

[https://staging-roundnet-karlsruhe.web.app/](https://staging-roundnet-karlsruhe.web.app/)

## Release

To create a release you need to push a commit to the `production` branch. <br/>
To prevent any unwanted releases, the pipeline only gets triggered when you merge via a Pull-Request.
To create one, follow the link bellow:

[<img src="images/pull-request-button.png" width="200"/>](https://github.com/risingwolf21/roundnet_karlsruhe_app/compare/production...master)


# Development

## Supabase

### Generate Typescript Types

> [!IMPORTANT]  
> **Saving format**: This file will be generated as a `UTF-16 LE`. Make sure to save it as a `UTF-8` file!

#### Staging
```
npx supabase gen types typescript --project-id vsuhzabcrnmrljzecxee > src/types/supabase-generated.types.ts
```

#### Production
```
npx supabase gen types typescript --project-id PROJECT_REF > src/types/supabase-generated.types.ts
```

### Database dump

#### Downloading database dump
```
npx supabase db dump --db-url postgres://postgres."$SUPABASE_PRODUCTION_ID":"$SUPABASE_PRODUCTION_DB_PASSWORD"@aws-0-eu-central-1.pooler.supabase.com:6543/postgres -f supabase/backup/data.sql --use-copy --data-only
```
```
npx supabase db dump --db-url postgres://postgres."$SUPABASE_PRODUCTION_ID":"$SUPABASE_PRODUCTION_DB_PASSWORD"@aws-0-eu-central-1.pooler.supabase.com:6543/postgres -f supabase/backup/schema.sql
```
```
npx supabase db dump --db-url postgres://postgres."$SUPABASE_PRODUCTION_ID":"$SUPABASE_PRODUCTION_DB_PASSWORD"@aws-0-eu-central-1.pooler.supabase.com:6543/postgres -f supabase/backup/roles.sql --role-only
```

#### Applying database dump
```
psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 -d postgres -U postgres.PROJECT_REF --single-transaction --variable ON_ERROR_STOP=1 --file backup/roles.sql --command 'SET session_replication_role = replica' --file backup/data.sql
```

### Migrations

```
supabase db diff --local
```
```
supabase migration new schema_test
```

Prints all changes from the local database setup to the linked project, as a sql command.
*For local development:* 
- Create changes in the local database 
- Create the diff from local to the production database
- Create Migration and add those changes


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

