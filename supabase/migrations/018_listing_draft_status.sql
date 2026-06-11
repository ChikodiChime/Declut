alter table listings
  drop constraint if exists listings_status_check;

alter table listings
  add constraint listings_status_check
    check (status in ('draft', 'available', 'sold', 'claimed', 'donated', 'removed'));
